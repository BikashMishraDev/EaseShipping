import { User } from '../models/User.js';
import { HttpError, asyncHandler } from './errors.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const id = req.session?.userId;
  if (!id) throw new HttpError(401, 'Sign in required');
  const user = await User.findById(id);
  if (!user) throw new HttpError(401, 'Sign in required');
  req.user = user;
  next();
});
