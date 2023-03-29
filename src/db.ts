import { SubmissionModelStatic, CourseModelStatic } from "db";
import { DataTypes, Sequelize, QueryTypes } from "sequelize";

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
    message: { type: DataTypes.STRING, allowNull: true },
  },
  {
    timestamps: true,
    underscored: true,
    indexes: [],
  }
) as SubmissionModelStatic;

export const Course = sequelize.define(
  "course",
  {
    name: { type: DataTypes.STRING, primaryKey: true },
    students: { type: DataTypes.JSON, allowNull: false },
    assignments: {  type: DataTypes.JSON, allowNull: false },
  }
) as CourseModelStatic;

// hack to not use migrations as alter:true does not work
async function addColumnToTable(tableName, columnName, type) {
  // Check if the message column exists
  const result = await sequelize.query(
    `PRAGMA table_info(${tableName});`,
    { type: QueryTypes.SELECT }
  );

  const messageColumnExists = result.some((column:any) => column.name === columnName);

  if (!messageColumnExists) {
    return await sequelize.query(
      `ALTER TABLE ${tableName} ADD COLUMN message ${type};`,
      { type: QueryTypes.RAW }
    );
  }
}


function ensureConnection(): Promise<any> {
  return new Promise((resolve, reject) => {
    return sequelize.sync().then(async () => {
      await addColumnToTable("submissions", "message", "TEXT");
      resolve('ok');
    }, ensureConnection);
  });
}

export const dbReady = ensureConnection();
