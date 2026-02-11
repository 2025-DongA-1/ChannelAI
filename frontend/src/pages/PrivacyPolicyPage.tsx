import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">개인정보처리방침</h1>
        
        <div className="space-y-8 text-gray-700">
          <section>
            <p className="mb-4">
              <strong>마지막 업데이트:</strong> 2026년 1월 29일
            </p>
            <p className="mb-4">
              NKLE("회사", "저희" 또는 "우리")는 귀하의 개인정보 보호를 중요하게 생각합니다. 
              본 개인정보처리방침은 귀하가 우리의 멀티채널 마케팅 플랫폼("서비스")을 사용할 때 
              수집, 사용, 공개하는 정보에 대해 설명합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 수집하는 정보</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">1.1 직접 제공하는 정보</h3>
            <p className="mb-3">귀하가 서비스 이용 시 직접 제공하는 정보:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>계정 정보:</strong> 이메일 주소, 비밀번호, 이름, 회사명</li>
              <li><strong>소셜 로그인 정보:</strong> 카카오, 네이버, 구글 계정 정보 (이메일, 프로필)</li>
              <li><strong>연락처 정보:</strong> 전화번호, 이메일 (선택사항)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">1.2 광고 플랫폼 연동 정보</h3>
            <p className="mb-3">귀하가 광고 플랫폼 연동을 승인할 때 수집하는 정보:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Meta (Facebook/Instagram) 광고:</strong>
                <ul className="list-circle pl-6 mt-2 space-y-1">
                  <li>광고 계정 정보 (계정 ID, 이름, 화폐 단위)</li>
                  <li>광고 캠페인 정보 (캠페인 이름, 상태, 목표, 예산)</li>
                  <li>광고 성과 데이터 (노출수, 클릭수, 전환수, 비용, CTR, CPC, ROAS)</li>
                  <li>페이지 정보 (연결된 Facebook 페이지)</li>
                </ul>
              </li>
              <li><strong>Google Ads:</strong> 광고 계정 및 성과 데이터</li>
              <li><strong>Naver Ads:</strong> 광고 계정 및 성과 데이터</li>
              <li><strong>당근마켓 Ads:</strong> 광고 계정 및 성과 데이터</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">1.3 자동으로 수집되는 정보</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>사용 정보:</strong> 서비스 이용 패턴, 접속 시간, 기능 사용 내역</li>
              <li><strong>기기 정보:</strong> IP 주소, 브라우저 유형, 운영체제</li>
              <li><strong>쿠키 및 추적 기술:</strong> 세션 관리, 사용자 선호도 저장</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 정보 사용 목적</h2>
            <p className="mb-3">수집한 정보는 다음의 목적으로 사용됩니다:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>서비스 제공:</strong> 통합 대시보드를 통한 광고 성과 모니터링</li>
              <li><strong>데이터 분석:</strong> 여러 플랫폼의 광고 데이터를 통합 분석 및 시각화</li>
              <li><strong>AI 추천:</strong> 머신러닝 모델을 통한 예산 최적화 및 플랫폼 추천</li>
              <li><strong>계정 관리:</strong> 사용자 인증, 보안 유지</li>
              <li><strong>고객 지원:</strong> 문의 응답, 기술 지원 제공</li>
              <li><strong>서비스 개선:</strong> 기능 향상, 버그 수정, 새로운 기능 개발</li>
              <li><strong>법적 의무 이행:</strong> 법률 준수, 분쟁 해결</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Meta 플랫폼 데이터 사용</h2>
            <p className="mb-3">Meta (Facebook/Instagram) 연동 시:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>귀하의 광고 데이터는 <strong>오직 귀하의 계정 내에서만</strong> 표시됩니다</li>
              <li>다른 사용자와 데이터를 공유하지 않습니다</li>
              <li>Meta 데이터는 <strong>AI 분석 및 추천 제공 목적으로만</strong> 사용됩니다</li>
              <li>제3자에게 판매, 임대, 또는 공유하지 않습니다</li>
              <li>Meta의 플랫폼 정책을 준수합니다</li>
              <li>귀하는 언제든지 연동을 해제할 수 있으며, 해제 시 저장된 데이터가 삭제됩니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 정보 공유 및 제3자 제공</h2>
            <p className="mb-3">우리는 다음의 경우를 제외하고 귀하의 개인정보를 제3자와 공유하지 않습니다:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>귀하의 동의:</strong> 명시적 동의를 받은 경우</li>
              <li><strong>서비스 제공업체:</strong> 
                <ul className="list-circle pl-6 mt-2 space-y-1">
                  <li>클라우드 호스팅 제공업체 (데이터 저장)</li>
                  <li>분석 도구 제공업체 (서비스 개선)</li>
                  <li>고객 지원 플랫폼</li>
                </ul>
              </li>
              <li><strong>법적 요구:</strong> 법원 명령, 정부 기관 요청 등 법적 의무 이행</li>
              <li><strong>권리 보호:</strong> 사기 방지, 보안 위협 대응</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 데이터 보관 및 삭제</h2>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>보관 기간:</strong> 계정 활성 상태 유지 기간 + 법적 요구사항에 따른 추가 기간</li>
              <li><strong>자동 삭제:</strong> 계정 삭제 후 30일 이내에 모든 개인정보 삭제</li>
              <li><strong>광고 플랫폼 데이터:</strong> 연동 해제 시 즉시 삭제</li>
              <li><strong>백업 데이터:</strong> 백업에서도 90일 이내 완전 삭제</li>
              <li><strong>익명화 데이터:</strong> 통계 및 분석을 위한 익명화된 데이터는 보관 가능</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. 데이터 보안</h2>
            <p className="mb-3">귀하의 정보를 보호하기 위해 다음의 보안 조치를 취합니다:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>암호화:</strong> 전송 중 데이터 (HTTPS/TLS) 및 저장 데이터 암호화</li>
              <li><strong>접근 제어:</strong> 최소 권한 원칙에 따른 직원 접근 제한</li>
              <li><strong>정기 감사:</strong> 보안 취약점 점검 및 개선</li>
              <li><strong>비밀번호 보안:</strong> 강력한 해시 알고리즘 (bcrypt) 사용</li>
              <li><strong>OAuth 토큰:</strong> 안전한 토큰 저장 및 자동 갱신</li>
            </ul>
            <p className="mt-3 text-sm italic">
              ⚠️ 그러나 완벽한 보안은 존재하지 않으며, 무단 접근, 공개, 변경, 파괴로부터 
              절대적인 보호를 보장할 수 없습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 귀하의 권리</h2>
            <p className="mb-3">귀하는 다음의 권리를 가집니다:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>접근권:</strong> 보유하고 있는 개인정보 확인 요청</li>
              <li><strong>수정권:</strong> 부정확한 정보의 수정 요청</li>
              <li><strong>삭제권:</strong> 개인정보 삭제 요청 ("잊혀질 권리")</li>
              <li><strong>처리 제한권:</strong> 특정 처리 활동 중단 요청</li>
              <li><strong>데이터 이동권:</strong> 구조화된 형식으로 데이터 수령</li>
              <li><strong>동의 철회권:</strong> 언제든지 동의 철회 가능</li>
              <li><strong>광고 연동 해제:</strong> 각 플랫폼 연동을 개별적으로 해제 가능</li>
            </ul>
            <p className="mt-3">
              권리 행사를 위해 <strong>anchursoo@naver.com</strong>으로 연락주시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. 쿠키 및 추적 기술</h2>
            <p className="mb-3">우리는 다음의 쿠키를 사용합니다:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>필수 쿠키:</strong> 로그인 세션 유지, 보안 기능</li>
              <li><strong>기능 쿠키:</strong> 사용자 선호도 저장 (언어, 테마)</li>
              <li><strong>분석 쿠키:</strong> 사용 패턴 분석, 서비스 개선</li>
            </ul>
            <p className="mt-3">
              브라우저 설정에서 쿠키를 거부할 수 있으나, 일부 기능이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 아동의 개인정보</h2>
            <p>
              우리 서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 
              고의로 아동의 개인정보를 수집하지 않습니다. 
              아동의 정보가 수집되었음을 알게 된 경우 즉시 삭제합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 국제 데이터 전송</h2>
            <p>
              귀하의 정보는 대한민국 내 서버에 저장됩니다. 
              일부 서비스 제공업체가 다른 국가에 위치할 수 있으며, 
              이 경우 적절한 보호조치를 취합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. 개인정보처리방침 변경</h2>
            <p className="mb-3">
              본 개인정보처리방침은 필요에 따라 업데이트될 수 있습니다. 
              중요한 변경 사항이 있을 경우:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>이메일을 통해 사전 통지</li>
              <li>웹사이트에 공지</li>
              <li>"마지막 업데이트" 날짜 변경</li>
            </ul>
            <p>
              변경 후 서비스를 계속 사용하는 것은 새로운 정책에 동의하는 것으로 간주됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. 연락처</h2>
            <p className="mb-3">개인정보 관련 문의사항이 있으시면 연락주시기 바랍니다:</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>서비스명:</strong> NKLE 멀티채널 마케팅 플랫폼</p>
              <p><strong>이메일:</strong> anchursoo@naver.com</p>
              <p><strong>App ID:</strong> 1946347369607018</p>
              <p className="mt-2 text-sm text-gray-600">
                개인정보 처리와 관련하여 불만이 있으신 경우, 
                개인정보보호위원회(www.pipc.go.kr) 또는 
                개인정보침해신고센터(privacy.kisa.or.kr)에 신고하실 수 있습니다.
              </p>
            </div>
          </section>

          <section className="mt-8 pt-8 border-t border-gray-300">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Meta 플랫폼 정책 준수</h2>
            <p className="mb-3">
              본 서비스는 Meta의 플랫폼 정책을 준수하며, 
              다음의 원칙을 따릅니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>사용자 데이터는 명시된 목적으로만 사용</li>
              <li>데이터 최소 수집 원칙 준수</li>
              <li>사용자 개인정보 보호 및 보안 유지</li>
              <li>투명한 데이터 사용 공개</li>
              <li>사용자의 명시적 동의 없이 데이터 공유 금지</li>
            </ul>
            <p className="text-sm text-gray-600">
              Meta 플랫폼 정책: 
              <a 
                href="https://developers.facebook.com/docs/development/release/policies" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                https://developers.facebook.com/docs/development/release/policies
              </a>
            </p>
          </section>

          <div className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-500">
            <p>본 개인정보처리방침은 2026년 1월 29일부터 적용됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
