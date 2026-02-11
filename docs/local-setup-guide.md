# Docker 없이 로컬 환경 구축 가이드

## PostgreSQL 설치 (Windows)

### 1. PostgreSQL 다운로드 및 설치
```
1. https://www.postgresql.org/download/windows/ 접속
2. "Download the installer" 클릭
3. PostgreSQL 15 버전 다운로드
4. 설치 시 다음 정보 기억:
   - 포트: 5432 (기본값)
   - 슈퍼유저 비밀번호: (직접 설정)
   - 로케일: Korean, Korea (또는 English)
```

### 2. 데이터베이스 생성
```powershell
# psql 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE marketing_platform;

# 사용자 생성
CREATE USER admin WITH PASSWORD 'your_password';

# 권한 부여
GRANT ALL PRIVILEGES ON DATABASE marketing_platform TO admin;

# 종료
\q
```

### 3. 스키마 적용
```powershell
psql -U admin -d marketing_platform -f database/schema.sql
```

## Redis 설치 (Windows)

### 옵션 1: Memurai (Redis 호환)
```
1. https://www.memurai.com/get-memurai 접속
2. Memurai Developer Edition 다운로드
3. 설치 및 실행
4. 기본 포트 6379에서 실행됨
```

### 옵션 2: WSL2 + Redis
```powershell
# WSL2에 Ubuntu 설치 후
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

## 환경 변수 설정

`.env` 파일 수정:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=marketing_platform
DB_USER=admin
DB_PASSWORD=your_password

REDIS_HOST=localhost
REDIS_PORT=6379
```

## 백엔드 개발 시작

### Node.js 백엔드
```powershell
# backend 디렉토리 생성
mkdir backend
cd backend

# package.json 초기화
npm init -y

# 필수 패키지 설치
npm install express cors dotenv pg redis axios bcrypt jsonwebtoken
npm install --save-dev typescript @types/node @types/express @types/pg ts-node nodemon

# TypeScript 설정
npx tsc --init

# 개발 서버 스크립트 추가
```

package.json에 추가:
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js"
  }
}
```

### Python 백엔드 (대안)
```powershell
# 가상환경 생성
python -m venv venv
.\venv\Scripts\Activate.ps1

# 필수 패키지 설치
pip install fastapi uvicorn sqlalchemy psycopg2-binary redis python-jose[cryptography] python-multipart
```

## 데이터베이스 연결 테스트

### Node.js
```javascript
// test-db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'marketing_platform',
  user: 'admin',
  password: 'your_password',
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Connection error:', err);
  } else {
    console.log('Connected to database:', res.rows[0]);
  }
  pool.end();
});
```

실행:
```powershell
node test-db.js
```

### Python
```python
# test_db.py
import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="marketing_platform",
        user="admin",
        password="your_password"
    )
    cursor = conn.cursor()
    cursor.execute("SELECT NOW()")
    result = cursor.fetchone()
    print(f"Connected to database: {result[0]}")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Connection error: {e}")
```

실행:
```powershell
python test_db.py
```

## pgAdmin 설치 (선택사항)

GUI로 데이터베이스를 관리하려면:
```
1. https://www.pgadmin.org/download/pgadmin-4-windows/ 접속
2. pgAdmin 4 다운로드 및 설치
3. 실행 후 서버 연결:
   - Host: localhost
   - Port: 5432
   - Database: marketing_platform
   - Username: admin
   - Password: (설정한 비밀번호)
```

## 다음 단계

1. ✅ PostgreSQL 설치 완료
2. ✅ Redis 설치 완료
3. ✅ 데이터베이스 스키마 적용
4. → 백엔드 프로젝트 초기화
5. → API 개발 시작
