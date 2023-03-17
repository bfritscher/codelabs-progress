import {
  createApp,
  ref,
  computed,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
createApp({
  setup() {
    const JWT_KEY = "CODELABS_PROGRESS_JWT";
    const jwt = localStorage.getItem(JWT_KEY);

    const submissions = ref([]);
    const courses = ref([]);

    const courseEdit = ref({
      name: "",
      assignments: "",
      students: "",
    });

    function init() {
      if (!jwt) {
        login();
      } else {
        getSubmissions();
        getCourses();
      }
    }

    function login() {
      localStorage.removeItem(JWT_KEY);
      window.location = `https://marmix.ig.he-arc.ch/shibjwt/?reply_to=${location.origin}/api/login`;
    }

    function getSubmissions() {
      fetch("/api/submissions", {
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
          submissions.value = data;
        });
    }

    function getCourses() {
      fetch("/api/courses", {
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
        });
    }


    init();

    function changeCourse(course) {
      fetch(`/api/course`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(course),
      }).then((response) => {
        return response.json();
      }).then(newCourse => {
        getCourses();
      })
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
      return courses.value.map((course) => {
        return course.students.map((email) => {
          return course.assignments.reduce((totals, assignment) => {
            totals.total += 1;
            console.log(assignment, email, submissionsIndex.value[assignment] && submissionsIndex.value[assignment][email])
            if (submissionsIndex.value[assignment] && submissionsIndex.value[assignment][email]) {
              totals[submissionsIndex.value[assignment][email].state] += 1;
            } else {
              totals.absent += 1;
            }
            return totals;
          }, {
            total: 0,
            absent: 0,
            submitted: 0,
            accepted: 0,
            rejected: 0,
          })
        });
      });
    });

    const assignmentsTotal = computed(() => {
      return courses.value.map((course) => {
        return course.assignments.map((assignment) => {
          return course.students.reduce((totals, email) => {
            totals.total += 1;
            if (submissionsIndex.value[assignment] && submissionsIndex.value[assignment][email]) {
              totals[submissionsIndex.value[assignment][email].state] += 1;
            } else {
              totals.absent += 1;
            }
            return totals;
          }, {
            total: 0,
            absent: 0,
            submitted: 0,
            accepted: 0,
            rejected: 0,
          })
        });
      });
    });


    return {
      courseEdit,
      submissions,
      courses,
      submissionsIndex,
      studentsTotal,
      assignmentsTotal,
      changeState(submission, state) {
        fetch(`/api/submission`, {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ ...submission, state }),
        }).then((response) => {
          return response.json();
        }).then(newSubmission => {
          Object.assign(submission, newSubmission)
        })
      },
      deleteSubmission(submission) {
        if(!confirm("Are you sure you want to delete this submission?")) return;
        fetch(`/api/submission`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify(submission),
        }).then((response) => {
          if(response.status === 200) {
            submissions.value = submissions.value.filter(s => s.id !== submission.id)
          };
        })
      },
      saveCourse(){
        changeCourse({
          name: courseEdit.value.name,
          assignments: courseEdit.value.assignments.split('\n').map(a => a.trim()),
          students: courseEdit.value.students.split('\n').map(a => a.trim()),
        })
      },
      editCourse(course) {
          courseEdit.value.name = course.name;
          courseEdit.value.assignments = course.assignments.join('\n');
          courseEdit.value.students = course.students.join('\n');
      }
    };
  },
}).mount("#app");
