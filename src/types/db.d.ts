import { Model, BuildOptions } from "sequelize";

export interface SubmissionModel extends Model {
  assignment: string;
  email: string;
  url: string;
  check_date?: Date;
  check_status?: string;
  check_content?: string;
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


