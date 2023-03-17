import { SubmissionModelStatic } from "db";
import { DataTypes, Sequelize } from "sequelize";

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "/app/db/data.sqlite",
});

export const Submission = sequelize.define(
  "submission",
  {
    assignment: { type: DataTypes.STRING, primaryKey: true },
    email: { type: DataTypes.STRING, primaryKey: true },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "submitted",
    },
  },
  {
    timestamps: true,
    underscored: true,
    indexes: [],
  }
) as SubmissionModelStatic;

function ensureConnection(): Promise<any> {
  return new Promise((resolve, reject) => {
    sequelize.sync().then(resolve, ensureConnection);
  });
}

export const dbReady = ensureConnection();
