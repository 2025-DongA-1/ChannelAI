
import os

PROXY_URL = "process.env.HTTPS_PROXY || 'http://10.10.10.6:3128'"

AXIOS_FILES = [
    'backend/src/controllers/socialAuthController.ts',
    'backend/src/services/external/googleAdsService.ts',
    'backend/src/services/external/naverAdsService.ts',
    'backend/src/services/external/metaAdsService.ts',
    'backend/src/services/external/karrotAdsService.ts',
    'backend/src/services/external/karrotCrawlerService.ts',
]

AXIOS_PROXY_CODE = """import { HttpsProxyAgent } from 'https-proxy-agent';
const proxyAgent = new HttpsProxyAgent(process.env.HTTPS_PROXY || 'http://10.10.10.6:3128');
axios.defaults.httpsAgent = proxyAgent;
axios.defaults.httpAgent = proxyAgent;
axios.defaults.proxy = false;"""

GROQ_FILE = 'backend/src/services/ai/aiAnalysisService.ts'
BASE_DIR = '/opt/marketing-platform'

def inject_axios(filepath):
    full = os.path.join(BASE_DIR, filepath)
    if not os.path.exists(full):
        print(f"  ⚠️  파일 없음: {filepath}")
        return
    with open(full, 'r') as f:
        content = f.read()
    if 'HttpsProxyAgent' in content:
        print(f"  ✅ 이미 있음: {os.path.basename(filepath)}")
        return
    content = content.replace("import axios from 'axios';", "import axios from 'axios';\n" + AXIOS_PROXY_CODE)
    with open(full, 'w') as f:
        f.write(content)
    print(f"  ✅ 주입 완료: {os.path.basename(filepath)}")

def inject_groq(filepath):
    full = os.path.join(BASE_DIR, filepath)
    if not os.path.exists(full):
        print(f"  ⚠️  파일 없음: {filepath}")
        return
    with open(full, 'r') as f:
        content = f.read()
    if 'HttpsProxyAgent' not in content:
        content = content.replace(
            'import Groq from "groq-sdk";',
            'import Groq from "groq-sdk";\nimport { HttpsProxyAgent } from "https-proxy-agent";'
        )
    old = "this.groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;"
    new = """const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY || 'http://10.10.10.6:3128');
      this.groq = process.env.GROQ_API_KEY ? new Groq({
        apiKey: process.env.GROQ_API_KEY,
        httpAgent: agent,
        timeout: 60000,
        maxRetries: 1,
      }) : null;"""
    if old in content:
        content = content.replace(old, new)
        print(f"  ✅ Groq 주입 완료: {os.path.basename(filepath)}")
    elif 'httpAgent' in content:
        print(f"  ✅ Groq 이미 있음: {os.path.basename(filepath)}")
    else:
        print(f"  ⚠️  Groq 패턴 못찾음 (수동 확인 필요)")
    with open(full, 'w') as f:
        f.write(content)


def inject_openai(filepath):
    full = os.path.join(BASE_DIR, filepath)
    if not os.path.exists(full):
        print(f"  ⚠️  파일 없음: {filepath}")
        return
    with open(full, 'r') as f:
        content = f.read()
    if 'openaiAgent' in content:
        print(f"  ✅ OpenAI 이미 있음: {os.path.basename(filepath)}")
        with open(full, 'w') as f:
            f.write(content)
        return
    old = "      const response = await fetch('https://api.openai.com/v1/chat/completions', {"
    new = """      const openaiAgent = new HttpsProxyAgent(process.env.HTTPS_PROXY || 'http://10.10.10.6:3128');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        // @ts-ignore
        agent: openaiAgent,"""
    if old in content:
        content = content.replace(old, new)
        print(f"  ✅ OpenAI 주입 완료: {os.path.basename(filepath)}")
    else:
        print(f"  ⚠️  OpenAI 패턴 못찾음 (수동 확인 필요)")
    with open(full, 'w') as f:
        f.write(content)

print("\n========== 프록시 주입 시작 ==========")
print("\n[1] axios 파일들:")
for f in AXIOS_FILES:
    inject_axios(f)
print("\n[2] Groq AI 서비스:")
inject_groq(GROQ_FILE)
print("\n[3] OpenAI 서비스:")
inject_openai(GROQ_FILE)
print("\n========== 완료! ==========")
print("빌드 명령어:")
print("  cd /opt/marketing-platform/backend && npm run build && pm2 restart marketing-api --update-env")
