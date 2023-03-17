const currentScript = document.currentScript;
(() => {
  const JWT_KEY = "CODELABS_PROGRESS_JWT";
  const BASE_URL = "http://localhost:8080";
  let jwtToken = null;
  let canUpload = false;

  const mainDiv = document.createElement("div");
  const loginButton = document.createElement("a");
  loginButton.innerText = "Login";
  loginButton.style.display = "none";
  loginButton.classList.add("btn-login");
  loginButton.addEventListener("click", login);
  mainDiv.append(loginButton);

  const assignmentDiv = document.createElement("div");
  mainDiv.append(assignmentDiv);

  const dropzoneDiv = document.createElement("div");
  dropzoneDiv.style.display = "none";
  dropzoneDiv.id = "myDropzone";
  dropzoneDiv.classList.add("dropzone");
  mainDiv.append(dropzoneDiv);
  let dropzone = null;

  const scriptDropzone = document.createElement("script");
  scriptDropzone.src = "https://unpkg.com/dropzone@5/dist/min/dropzone.min.js";
  scriptDropzone.onload = () => {
    Dropzone.autoDiscover = false;
    init();
    dropzone = new Dropzone("#myDropzone", {
      url: "/",
      maxFiles: 1,
      acceptedFiles: "image/*",
      dictDefaultMessage: "Drop files here to upload or CTRL + V"
    });
    dropzone.on("addedfile", function () {
      while (this.files.length > this.options.maxFiles)
        this.removeFile(this.files[0]);
    });
    dropzone.on("success", function (file, response) {
      console.log(file, response);
    });
    document.onpaste = function (event) {
      const items = (event.clipboardData || event.originalEvent.clipboardData)
        .items;
      items.forEach((item) => {
        if (item.kind === "file") {
          // adds the file to your dropzone instance
          if (canUpload) {
            dropzone.addFile(item.getAsFile());
          }
        }
      });
    };
  };
  mainDiv.appendChild(scriptDropzone);
  const styleDropzone = document.createElement("link");
  styleDropzone.rel = "stylesheet";
  styleDropzone.href = "https://unpkg.com/dropzone@5/dist/min/dropzone.min.css";
  styleDropzone.type = "text/css";
  document.head.appendChild(styleDropzone);

  function init() {
    jwtToken = localStorage.getItem(JWT_KEY);
    if (!jwtToken) {
      loginButton.style.display = "inline-block";
    } else {
      getState();
    }
  }

  function login() {
    window.open(
      `https://marmix.ig.he-arc.ch/shibjwt/?reply_to=${BASE_URL}/api/login`,
      "_blank",
      "popup=1,width=800,height=600"
    );
  }

  function getAssignment() {
    return "todo";
  }

  function getState() {
    fetch(`${BASE_URL}/api/submission?assignment=${getAssignment()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
    })
      .then((res) => {
        if (res.status === 403) {
          localStorage.removeItem(JWT_KEY);
          init();
          throw new Error("Invalid token");
        }
        return res.json();
      })
      .then(renderSubmission);
  }

  function renderSubmission(submission) {
    loginButton.style.display = "none";
    if (submission) {
      // display
      assignmentDiv.innerHTML = `<h4>Your submission is <span class="submission-state ${submission.state}">${submission.state}</span>:</h4><img style="max-width:100%;" src="${BASE_URL}/codelabs/${getAssignment()}/${submission.email}.jpg"/>`;
    }
    if (
      !submission ||
      submission.state === "submitted" ||
      submission.state === "rejected"
    ) {
      enableUpload();
    }
  }

  function enableUpload() {
    canUpload = true;
    dropzone.options.url = `${BASE_URL}/api/submit?assignment=${getAssignment()}`;
    dropzone.options.headers = {
      Authorization: `Bearer ${jwtToken}`,
    };
    dropzoneDiv.style.display = "block";
  }

  window.addEventListener(
    "message",
    (event) => {
      jwtToken = event.data;
      localStorage.setItem(JWT_KEY, jwtToken);
      init();
    },
    false
  );
  window.addEventListener("DOMContentLoaded", () => {
    currentScript.after(mainDiv);
  });
})();
