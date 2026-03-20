import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_CODES, createErrorResponse } from '../constants/errorCodes';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(createErrorResponse(ERROR_CODES.AUTH.UNAUTHORIZED));
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    
    next();
  } catch (error) {
    return res.status(401).json(createErrorResponse(ERROR_CODES.AUTH.INVALID_TOKEN));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json(createErrorResponse(ERROR_CODES.COMMON.FORBIDDEN));
    }
    
    next();
  };
};
