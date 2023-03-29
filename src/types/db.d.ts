import { Model, BuildOptions } from "sequelize";

export interface SubmissionModel extends Model {
  assignment: string;
  email: string;
  state: string;
  message?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type SubmissionModelStatic = typeof Model & {
  new (values?: object, options?: BuildOptions): SubmissionModel
}

export interface CourseModel extends Model {
  name: string;
  students: string[];
  assignments: string[];
}
type CourseModelStatic = typeof Model & {
  new (values?: object, options?: BuildOptions): CourseModel
}


