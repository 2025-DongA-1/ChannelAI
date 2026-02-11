import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: '인증 토큰이 필요합니다.',
      });
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
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: '유효하지 않은 토큰입니다.',
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: '권한이 없습니다.',
      });
    }
    
    next();
  };
};
