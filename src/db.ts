import { SubmissionAttribute, SubmissionInstance } from "db";
import Sequelize from "sequelize";

export const sequelize = new Sequelize(
  `postgres://${process.env.POSTGRES_USER}:${
    process.env.POSTGRES_PASSWORD
  }@db:5432/${process.env.POSTGRES_DB}`
);

export const Submission = sequelize.define<SubmissionInstance, SubmissionAttribute>(
  "submission",
  {
    assignment: { type: Sequelize.STRING, primaryKey: true },
    email: { type: Sequelize.STRING, primaryKey: true },
    url: {
      type: Sequelize.STRING,
      validate: {
        isUrl: true
      }
    },
    check_date: {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    },
    check_status: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    },
    check_content: {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null
    }
  },
  {
    timestamps: true,
    underscored: true,
    indexes: [
      {
        // same url only allowed once by assignment
        unique: true,
        fields: ["assignment", "url"]
      }
    ]
  }
);

function ensureConnection():Promise<any> {
  return new Promise((resolve, reject) => {
    sequelize.sync().then(resolve, ensureConnection)
  })
}

export const dbReady = ensureConnection();