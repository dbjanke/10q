import { User as AppUser } from '../types.js';

declare global {
    namespace Express {
        interface User extends AppUser {
            _appUserBrand?: never;
        }
        interface Request {
            user?: User;
            id?: string;
        }
    }
}

export { };
