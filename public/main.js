import {
  createApp,
  ref,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
createApp({
  setup() {
    const JWT_KEY = "CODELABS_PROGRESS_JWT";
    const jwt = localStorage.getItem(JWT_KEY);
    
    const submissions = ref([]);

    function init() {
      if (!jwt) {
        login();
      } else {
        getSubmissions();
      }
    }

    function login() {
      localStorage.removeItem(JWT_KEY);
      window.location = `https://marmix.ig.he-arc.ch/shibjwt/?reply_to=${location.origin}/api/login`;
    }

    function getSubmissions() {
      fetch("api/submissions", {
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
    init();
    return {
      submissions,
    };
  },
}).mount("#app");