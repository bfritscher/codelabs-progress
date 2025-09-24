import {
  createApp,
  defineComponent,
  ref,
  computed,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

const BASE_URL = 'https://codelabs.bf0.ch';
const UPDATE_INTERVAL = 5000;
const SEPARATOR_ASSIGNMENT = "---";

const myTotals = defineComponent({
  props: ["value"],
  setup(props) {
    const value = computed(() => {
      return props.value;
    })
    return {
      value,
    };
  },
  template: `<div class="text-nowrap">
    <span class="accepted">{{ value.accepted }}</span> |
    <span class="rejected">{{ value.rejected }}</span> |
    <span class="submitted">{{value.submitted}}</span> |
    <span class="absent">{{value.absent}}</span></div>`,
});

createApp({
  components: {
    myTotals,
  },
  setup() {
    const JWT_KEY = "CODELABS_PROGRESS_JWT";
    const SELECTED_COURSE_KEY = "CODELABS_SELECTED_COURSE";
    const jwt = localStorage.getItem(JWT_KEY);

    const submissions = ref([]);
    const courses = ref([]);

    const courseEdit = ref({
      name: "",
      assignments: "",
      students: "",
    });

    const showCourseEdit = ref(false);

    const selectedCourse = ref({
      name: "",
      assignments: [],
      students: [],
    });

    const selectedAssignment = ref(null);

    const filterState = ref("");

    const lastUpdated = ref();

    let activeTimeout = undefined;

    function init() {
      if (!jwt) {
        login();
      } else {
        getCourses();
      }
    }

    function login() {
      localStorage.removeItem(JWT_KEY);
      window.location = `https://marmix.ig.he-arc.ch/shibjwt/?reply_to=${location.origin}/api/login`;
    }

    function getSubmissions(courseName) {
      if (activeTimeout) {
        clearTimeout(activeTimeout);
      }
      activeTimeout = setTimeout(() => {
        getSubmissions(courseName);
      }, UPDATE_INTERVAL);
      fetch(`${BASE_URL}/api/submissions/${courseName}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      })
        .then((res) => {
          if (res.status === 403) {
            return login();
          }
          return res.json();
        })
        .then((data) => {
          for(const submission of data) {
            const s = submissions.value.find((s) => s.assignment === submission.assignment && s.email === submission.email);
            if (s) {
              Object.assign(s, submission);
            } else {
              submission.editedMessage = submission.message;
              submissions.value.push(submission);
            }
          }
          
          lastUpdated.value = new Date().toLocaleDateString('fr-CH') + " " + new Date().toLocaleTimeString('fr-CH');
        });
    }

    function getCourses() {
      return fetch(`${BASE_URL}/api/courses`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      })
        .then((res) => {
          if (res.status === 403) {
            return login();
          }
          return res.json();
        })
        .then((data) => {
          courses.value = data;
          if (data.length > 0) {
            const courseName = localStorage.getItem(SELECTED_COURSE_KEY);
            handleCourseSelect(courseName || data[0].name);
          }
        });
    }

    init();

    function changeCourse(course) {
      fetch(`${BASE_URL}/api/course`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(course),
      })
        .then((response) => {
          return response.json();
        })
        .then(async (newCourse) => {
          await getCourses();
          handleCourseSelect(newCourse.name);
        });
    }

    const submissionsIndex = computed(() => {
      const index = {};
      for (const submission of submissions.value) {
        if (!index.hasOwnProperty(submission.assignment)) {
          index[submission.assignment] = {};
        }
        if (!index[submission.assignment].hasOwnProperty(submission.email)) {
          index[submission.assignment][submission.email] = {};
        }
        index[submission.assignment][submission.email] = submission;
      }
      return index;
    });

    const studentsTotal = computed(() => {
      return selectedCourse.value.students.map((email) => {
        return selectedCourse.value.assignments.reduce(
          (totals, assignment) => {
            if (assignment === SEPARATOR_ASSIGNMENT) {
              return totals;
            }
            totals.total += 1;
            if (
              submissionsIndex.value[assignment] &&
              submissionsIndex.value[assignment][email]
            ) {
              totals[submissionsIndex.value[assignment][email].state] += 1;
            } else {
              totals.absent += 1;
            }
            return totals;
          },
          {
            total: 0,
            absent: 0,
            submitted: 0,
            accepted: 0,
            rejected: 0,
          }
        );
      });
    });

    const assignmentsTotal = computed(() => {
      return selectedCourse.value.assignments.map((assignment) => {
        if (assignment === SEPARATOR_ASSIGNMENT) {
          return {
            total: 0,
            absent: 0,
            submitted: 0,
            accepted: 0,
            rejected: 0,
          };
        }
        return selectedCourse.value.students.reduce(
          (totals, email) => {
            totals.total += 1;
            if (
              submissionsIndex.value[assignment] &&
              submissionsIndex.value[assignment][email]
            ) {
              totals[submissionsIndex.value[assignment][email].state] += 1;
            } else {
              totals.absent += 1;
            }
            return totals;
          },
          {
            total: 0,
            absent: 0,
            submitted: 0,
            accepted: 0,
            rejected: 0,
          }
        );
      });
    });

    const filteredSubmissions = computed(() => {
      return submissions.value.filter((submission) => {
        return (
          submission.state.includes(filterState.value) &&
          submission.assignment === selectedAssignment.value &&
          selectedCourse.value.students.includes(submission.email)
        );
      }).sort((a, b) => {
        return selectedCourse.value.students.findIndex((email) => email === a.email) - selectedCourse.value.students.findIndex((email) => email === b.email)
      });
    });

    function handleCourseSelect(name) {
      selectedAssignment.value = null;
      if (name === "add_new") {
        courseEdit.value.name = prompt("Course name");
        courseEdit.value.assignments = "";
        courseEdit.value.students = "";
        showCourseEdit.value = true;
      } else {
        localStorage.setItem(SELECTED_COURSE_KEY, name);
        selectedCourse.value = courses.value.find((c) => c.name === name);
        getSubmissions(name);
      }
    }

    return {
      BASE_URL,
      SEPARATOR_ASSIGNMENT,
      stateToEmoji: {
        submitted: "📩",
        accepted: "✅",
        rejected: "❌"
      },
      lastUpdated,
      courseEdit,
      showCourseEdit,
      selectedCourse,
      selectedAssignment,
      submissions,
      filteredSubmissions,
      filterState,
      courses,
      submissionsIndex,
      studentsTotal,
      assignmentsTotal,
      handleCourseSelect,
      changeState(submission, state) {
        submission.message = submission.editedMessage;
        fetch(`${BASE_URL}/api/submission`, {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ ...submission, state }),
        })
          .then((response) => {
            return response.json();
          })
          .then((newSubmission) => {
            submission.state = newSubmission.state;
          });
      },
      deleteSubmission(submission) {
        if (!confirm("Are you sure you want to delete this submission?"))
          return;
        fetch(`${BASE_URL}/api/submission`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify(submission),
        }).then((response) => {
          if (response.status === 200) {
            submissions.value = submissions.value.filter(
              (s) => s.id !== submission.id
            );
          }
        });
      },
      saveCourse() {
        changeCourse({
          name: courseEdit.value.name,
          assignments: courseEdit.value.assignments
            .split("\n")
            .map((a) => a.trim()),
          students: courseEdit.value.students.split("\n").map((a) => a.trim()),
        });
        showCourseEdit.value = false;
      },
      editCourse(course) {
        courseEdit.value.name = course.name;
        courseEdit.value.assignments = course.assignments.join("\n");
        courseEdit.value.students = course.students.join("\n");
        showCourseEdit.value = true;
      },
      deleteCourse() {
        const course = selectedCourse.value;
        if (!confirm("Are you sure you want to delete this course?")) return;
        fetch(`${BASE_URL}/api/course`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify(course),
        }).then((response) => {
          if (response.status === 200) {
            showCourseEdit.value = false;
            getCourses();
          }
        });
      },
      scrollTo(assignment, email) {
        selectedAssignment.value = assignment;
        setTimeout(() => {
          const el = document.getElementById(email.replace(/[\W_]+/g, ""));
          if (el) {
            el.scrollIntoView();
          }
        }, 500);
      },
      zoom(element) {
        panzoom(element);
      },
      nl2br(str) {
        return str && str.replace(/\n/g, "<br>") || str;
      }
    };
  },
}).mount("#app");
