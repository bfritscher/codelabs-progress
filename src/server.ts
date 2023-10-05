import bodyParser from "body-parser";
import express from "express";
import cors from "cors";
import fs from "fs-extra";
import multer from "multer";
import Sequelize from "sequelize";

const Op = Sequelize.Op;

const storage = multer.diskStorage({
  async destination(req, file, cb) {
    const dir = `/app/public/codelabs/${req.query.assignment}`
    await fs.ensureDir(dir);
    // use assingment for folder
    cb(null, dir)
  },
  filename(req, file, cb) {
    cb(null, `${req.user.email}.jpg`)
  }
})

const upload = multer({ storage })

import { dbReady, Submission, Course } from "./db";
import User from "./User";

const urlencodeParser = bodyParser.urlencoded({ extended: false });

async function ensureUser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      const token = req.headers.authorization.split(' ')[1];
      req.user = await User.fromToken(token);
      next();
    } else {
      throw new Error("No Bearer Token found");
    }
  } catch (e) {
    res.sendStatus(403);
  }
}

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/api", (req, res) => res.send("API OK"));

app.post(
  "/api/login",
  urlencodeParser,
  (req: express.Request, res: express.Response) => {
    res.send(
      `<script>
if(window.opener) {
  window.opener.postMessage('${req.body.jwt}', '*');
  window.close();
} else {
  localStorage.setItem('CODELABS_PROGRESS_JWT', '${req.body.jwt}');
  window.location='/';
}
</script>`
    );
  }
);

app.get(
  "/api/submission",
  ensureUser,
  (req: express.Request, res: express.Response) => {
    const query: any = {
      where: {}
    };
    query.where.email = req.user.email;
    query.where.assignment = req.query.assignment;
    Submission.findOne(query).then(submission => {
      res.json(submission);
    }, (e) => {
      console.log("query error", e);
      res.sendStatus(500);
    });
  }
);


app.get(
  "/api/submissions/:courseName",
  ensureUser,
  (req: express.Request, res: express.Response) => {
    // only get submissions for students in course
    Course.findOne({
      where: {
        name: req.params.courseName,
      }
    }).then((course) => {
      console.log("students", course.students);
      const query: any = {
        where: {
          email: course.students,
        }
      };
      // limit to own submissions
      if (!req.user.isAdmin) {
        query.where.email = req.user.email;
      }      
      Submission.findAll(query).then(submissions => {
        res.json(submissions);
      }, (e) => {
        console.log("query error", e);
        res.sendStatus(500);
      });
    })
  }
);

app.patch(
  "/api/submission",
  ensureUser,
  (req: express.Request, res: express.Response) => {
    if (!req.user.isAdmin) {
      res.json({});
      return;
    }
    Submission.upsert(req.body).then((submission) => {
      res.json(submission[0]);
    }).catch((e) => {
      console.log("upsert error", e);
      res.sendStatus(500);
    });
  }
);

app.delete(
  "/api/submission",
  ensureUser,
  (req: express.Request, res: express.Response) => {
    if (!req.user.isAdmin) {
      res.json({});
      return;
    }
    Submission.findOne({
      where: {
        assignment: req.body.assignment,
        email: req.body.email,
      }
    }).then((submission) => {
      return submission.destroy();
    })
    .then(() => {
      res.sendStatus(200);
    })
    .catch((e) => {
      console.log("upsert error", e);
      res.sendStatus(500);
    });
  }
);

app.delete(
  "/api/course",
  ensureUser,
  (req: express.Request, res: express.Response) => {
    if (!req.user.isAdmin) {
      res.json({});
      return;
    }
    Course.findOne({
      where: {
        name: req.body.name,
      }
    }).then((course) => {
      return course.destroy();
    })
    .then(() => {
      res.sendStatus(200);
    })
    .catch((e) => {
      console.log("upsert error", e);
      res.sendStatus(500);
    });
  }
);

app.post(
  "/api/submit",
  ensureUser,
  upload.single('file'),
  (req: express.Request, res: express.Response) => {
    // TODO: disallow upsert if already accepted?
    Submission.upsert({
      assignment: req.query.assignment,
      email: req.user.email,
      state: "submitted",
    }).then((submission) => {
      res.json(submission[0]);
    }).catch((e) => {
      console.log("upsert error", e);
      res.sendStatus(500);
    });
  }
);

app.get(
  "/api/courses",
  ensureUser,
  (req: express.Request, res: express.Response) => {
    const query: any = {
      where: {}
    };
    if (!req.user.isAdmin) {
      // limit to student's courses
      query.where.students = { [Op.like]: [`%${req.user.email}%`] }; 
    }    
    Course.findAll(query).then(courses => {
      if (!req.user.isAdmin) {
        // filter other students
        courses = courses.map(course => {
          course.students = course.students.filter((student) => student === req.user.email);
          return course
        });
      }
      res.json(courses);
    }, (e) => {
      console.log("query error", e);
      res.sendStatus(500);
    });
  }
);


app.post(
  "/api/course",
  ensureUser,
  (req: express.Request, res: express.Response) => {
    if (!req.user.isAdmin) {
      res.json({});
      return;
    }
    Course.upsert(req.body).then((course) => {
      res.json(course[0]);
    }).catch((e) => {
      console.log("upsert error", e);
      res.sendStatus(500);
    });
  }
);

dbReady.then(() => {
  console.log("sequelize synced");
});
app.listen(8080, () => console.log("app listening on port 8080!"));
