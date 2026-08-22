import { AppError } from "./AppError";

export class AssertUserApi extends AppError {
    constructor(message: string = 'Assert Data', errorCode: string = 'ASSERT USER VERIFICATION', details: Record<string, unknown>) {
        super(201, message, errorCode, true, details);
    }
}