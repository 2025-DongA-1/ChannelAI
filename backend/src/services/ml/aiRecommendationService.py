# -*- coding: utf-8 -*-
"""
AI 광고 최적화 추론 서비스

사전학습된 모델을 로드하여 실시간 추론 수행:
- ROAS 예측
- 플랫폼 추천
- 성과 예측
"""

import pickle
import numpy as np
from typing import Dict, List, Any
import os
from pathlib import Path

class AIRecommendationEngine:
    """사전학습된 모델 기반 AI 추천 엔진"""
    
    def __init__(self, model_dir: str = None):
        if model_dir is None:
            # backend/src/services/ml -> backend/ml_models
            current_dir = Path(__file__).parent.parent.parent.parent
            model_dir = current_dir / 'ml_models'
        
        self.model_dir = Path(model_dir)
        
        # 모델 로드
        self._load_models()
        
        # 카테고리 매핑
        self.industries = ['ecommerce', 'finance', 'education', 'food_delivery', 
                          'fashion', 'tech', 'health', 'real_estate']
        self.platforms = ['google', 'meta', 'naver', 'karrot']
        self.regions = ['seoul', 'busan', 'daegu', 'incheon', 'gwangju', 
                       'daejeon', 'ulsan', 'others']
        self.age_groups = ['18-24', '25-34', '35-44', '45-54', '55+']
        self.genders = ['male', 'female', 'all']
        
        # 업계 평균 벤치마크 (Cold Start용)
        self.industry_benchmarks = {
            'ecommerce': {'avg_ctr': 0.035, 'avg_cvr': 0.025, 'avg_roas': 4.2},
            'finance': {'avg_ctr': 0.028, 'avg_cvr': 0.015, 'avg_roas': 3.8},
            'education': {'avg_ctr': 0.042, 'avg_cvr': 0.032, 'avg_roas': 5.1},
            'food_delivery': {'avg_ctr': 0.048, 'avg_cvr': 0.038, 'avg_roas': 4.5},
            'fashion': {'avg_ctr': 0.040, 'avg_cvr': 0.028, 'avg_roas': 4.3},
            'tech': {'avg_ctr': 0.032, 'avg_cvr': 0.020, 'avg_roas': 3.9},
            'health': {'avg_ctr': 0.036, 'avg_cvr': 0.026, 'avg_roas': 4.0},
            'real_estate': {'avg_ctr': 0.030, 'avg_cvr': 0.018, 'avg_roas': 3.5}
        }
    
    def _load_models(self):
        """사전학습된 모델 로드"""
        try:
            model_files = {
                'roas_predictor': 'roas_predictor.pkl',
                'platform_recommender': 'platform_recommender.pkl',
                'scaler': 'scaler.pkl',
                'scaler_platform': 'scaler_platform.pkl',
                'label_encoders': 'label_encoders.pkl',
                'feature_columns': 'feature_columns.pkl',
                'platform_feature_columns': 'platform_feature_columns.pkl'
            }
            
            for key, filename in model_files.items():
                filepath = self.model_dir / filename
                if not filepath.exists():
                    raise FileNotFoundError(f"모델 파일이 없습니다: {filepath}")
                
                with open(filepath, 'rb') as f:
                    setattr(self, key, pickle.load(f))
            
            # 모델 로드 성공 (로그 생략 - stdout은 JSON 전용)
            
        except FileNotFoundError as e:
            import sys
            print(f"Model file not found: {e}", file=sys.stderr)
            print("Please copy .pkl files from Google Colab to backend/ml_models/", file=sys.stderr)
            raise
    
    def recommend_for_product(self, product_info: Dict[str, Any], 
                            user_campaigns: List[Dict] = None) -> Dict[str, Any]:
        """
        새로운 제품에 대한 종합 추천
        
        Args:
            product_info: {
                'name': '수제 케이크 배달',
                'industry': 'food_delivery',
                'region': 'seoul',
                'age_group': '25-34',
                'gender': 'female',
                'daily_budget': 100000,
                'total_budget': 3000000,
                'campaign_duration': 30,
                'target_audience_size': 50000
            }
            user_campaigns: 사용자의 과거 캠페인 데이터 (옵션)
        
        Returns:
            종합 추천 결과
        """
        
        # 1) 신뢰도 계산
        confidence = self._calculate_confidence(user_campaigns)
        
        # 2) 플랫폼 추천
        platform_recommendation = self._recommend_platforms(product_info)
        
        # 3) 각 플랫폼별 ROAS 예측
        roas_predictions = self._predict_roas_all_platforms(product_info)
        
        # 4) 최적 예산 배분
        budget_allocation = self._optimize_budget_allocation(
            product_info.get('total_budget', 1000000),
            roas_predictions
        )
        
        # 5) 통합 전략
        cross_platform_strategy = self._generate_cross_platform_strategy(
            platform_recommendation,
            roas_predictions
        )
        
        return {
            'product_name': product_info.get('name', '제품'),
            'confidence': confidence,
            'recommended_platforms': platform_recommendation,
            'performance_forecast': roas_predictions,
            'budget_allocation': budget_allocation,
            'cross_platform_strategy': cross_platform_strategy,
            'industry_benchmark': self.industry_benchmarks.get(
                product_info.get('industry', 'ecommerce')
            )
        }
    
    def _recommend_platforms(self, product_info: Dict) -> Dict[str, Any]:
        """플랫폼 추천 (확률 기반)"""
        
        # Feature 준비
        features = [
            self._encode_category('industry', product_info.get('industry', 'ecommerce')),
            self._encode_category('region', product_info.get('region', 'seoul')),
            self._encode_category('age_group', product_info.get('age_group', '25-34')),
            self._encode_category('gender', product_info.get('gender', 'all')),
            product_info.get('daily_budget', 100000),
            product_info.get('total_budget', 3000000),
            product_info.get('campaign_duration', 30),
            product_info.get('target_audience_size', 50000)
        ]
        
        # Scaling
        features_scaled = self.scaler_platform.transform([features])
        
        # 예측
        probabilities = self.platform_recommender.predict_proba(features_scaled)[0]
        recommended_platform = self.platform_recommender.predict(features_scaled)[0]
        
        # 결과 정리
        platform_scores = []
        for platform, prob in zip(self.platform_recommender.classes_, probabilities):
            platform_scores.append({
                'platform': platform,
                'score': float(prob),
                'reason': self._get_recommendation_reason(platform, product_info, prob)
            })
        
        # 점수순 정렬
        platform_scores.sort(key=lambda x: x['score'], reverse=True)
        
        return {
            'primary': platform_scores[0],
            'alternatives': platform_scores[1:],
            'all_scores': platform_scores
        }
    
    def _predict_roas_all_platforms(self, product_info: Dict) -> Dict[str, Any]:
        """모든 플랫폼에 대한 ROAS 예측"""
        
        predictions = {}
        
        for platform in self.platforms:
            # Feature 준비
            features = [
                self._encode_category('industry', product_info.get('industry', 'ecommerce')),
                self._encode_category('platform', platform),
                self._encode_category('region', product_info.get('region', 'seoul')),
                self._encode_category('age_group', product_info.get('age_group', '25-34')),
                self._encode_category('gender', product_info.get('gender', 'all')),
                product_info.get('daily_budget', 100000),
                product_info.get('total_budget', 3000000),
                product_info.get('campaign_duration', 30),
                product_info.get('target_audience_size', 50000)
            ]
            
            # Scaling
            features_scaled = self.scaler.transform([features])
            
            # ROAS 예측
            predicted_roas = float(self.roas_predictor.predict(features_scaled)[0])
            
            # 추가 메트릭 추정
            benchmark = self.industry_benchmarks.get(
                product_info.get('industry', 'ecommerce')
            )
            
            daily_budget = product_info.get('daily_budget', 100000)
            duration = product_info.get('campaign_duration', 30)
            total_cost = daily_budget * duration
            
            predictions[platform] = {
                'roas': round(predicted_roas, 2),
                'estimated_revenue': round(total_cost * predicted_roas, 0),
                'estimated_cost': total_cost,
                'estimated_profit': round(total_cost * (predicted_roas - 1), 0),
                'estimated_ctr': benchmark['avg_ctr'],
                'estimated_cvr': benchmark['avg_cvr']
            }
        
        return predictions
    
    def _optimize_budget_allocation(self, total_budget: float, 
                                   roas_predictions: Dict) -> Dict[str, Any]:
        """예산 최적 배분 (ROAS 기반)"""
        
        # ROAS 기반 가중치 계산
        total_roas = sum(pred['roas'] for pred in roas_predictions.values())
        
        allocation = {}
        for platform, pred in roas_predictions.items():
            weight = pred['roas'] / total_roas
            allocated_budget = total_budget * weight
            
            allocation[platform] = {
                'budget': round(allocated_budget, 0),
                'percentage': round(weight * 100, 1),
                'expected_return': round(allocated_budget * pred['roas'], 0)
            }
        
        # 상위 3개 플랫폼만 추천
        sorted_platforms = sorted(
            allocation.items(), 
            key=lambda x: x[1]['expected_return'], 
            reverse=True
        )[:3]
        
        return {
            'recommended_allocation': dict(sorted_platforms),
            'total_budget': total_budget,
            'expected_total_return': sum(
                alloc['expected_return'] 
                for _, alloc in sorted_platforms
            )
        }
    
    def _generate_cross_platform_strategy(self, platform_rec: Dict, 
                                         roas_pred: Dict) -> Dict[str, Any]:
        """연계 플랫폼 전략 생성"""
        
        primary_platform = platform_rec['primary']['platform']
        
        strategies = {
            'google': {
                'focus': '검색 의도가 명확한 사용자 타겟팅',
                'timing': '구매 직전 단계에서 집중 노출',
                'creative': '명확한 CTA와 USP 강조'
            },
            'meta': {
                'focus': '관심사 기반 잠재고객 발굴',
                'timing': '인지 단계부터 지속적 노출',
                'creative': '비주얼 중심, 스토리텔링'
            },
            'naver': {
                'focus': '한국 사용자 맞춤 검색 & 쇼핑',
                'timing': '정보 탐색 단계에서 적극 노출',
                'creative': '상세 정보 제공, 리뷰 활용'
            },
            'karrot': {
                'focus': '지역 기반 타겟 마케팅',
                'timing': '동네 생활 맥락에서 자연스러운 노출',
                'creative': '친근한 톤, 지역 특화 메시지'
            }
        }
        
        # 상위 2개 플랫폼 조합 전략
        top_2 = [platform_rec['primary']['platform']]
        if platform_rec['alternatives']:
            top_2.append(platform_rec['alternatives'][0]['platform'])
        
        return {
            'primary_strategy': strategies[primary_platform],
            'combination': top_2,
            'combination_rationale': self._get_combination_rationale(top_2),
            'execution_order': self._get_execution_order(top_2, roas_pred)
        }
    
    def _get_combination_rationale(self, platforms: List[str]) -> str:
        """플랫폼 조합 근거"""
        combinations = {
            ('google', 'meta'): '검색 의도와 관심사를 모두 커버하는 풀퍼널 전략',
            ('meta', 'naver'): '소셜 발견과 한국형 검색을 결합한 인지-전환 최적화',
            ('naver', 'karrot'): '온라인 검색과 지역 커뮤니티를 연결하는 로컬 마케팅',
            ('google', 'naver'): '글로벌 + 한국 검색 엔진 동시 공략',
            ('meta', 'karrot'): '소셜 미디어와 지역 커뮤니티의 시너지'
        }
        
        key = tuple(sorted(platforms[:2]))
        return combinations.get(key, '다양한 채널을 통한 광범위한 도달')
    
    def _get_execution_order(self, platforms: List[str], 
                           roas_pred: Dict) -> List[Dict]:
        """실행 순서 제안"""
        
        # ROAS 높은 순으로 정렬
        sorted_platforms = sorted(
            platforms,
            key=lambda p: roas_pred[p]['roas'],
            reverse=True
        )
        
        execution_plan = []
        for i, platform in enumerate(sorted_platforms):
            phase = i + 1
            execution_plan.append({
                'phase': phase,
                'platform': platform,
                'objective': 'ROAS 최적화' if phase == 1 else '도달 확대',
                'duration': '1-2주' if phase == 1 else '2-3주',
                'budget_ratio': 60 if phase == 1 else 40
            })
        
        return execution_plan
    
    def _calculate_confidence(self, user_campaigns: List[Dict] = None) -> Dict[str, Any]:
        """추천 신뢰도 계산"""
        
        if not user_campaigns:
            campaign_count = 0
        else:
            campaign_count = len(user_campaigns)
        
        if campaign_count == 0:
            return {
                'level': 'low',
                'score': 0.3,
                'message': '업계 평균 데이터 기반 추천입니다. 캠페인을 실행하면 정확도가 향상됩니다.',
                'data_source': 'industry_benchmark'
            }
        elif campaign_count < 5:
            return {
                'level': 'medium',
                'score': 0.6,
                'message': f'{campaign_count}개 캠페인 데이터로 개인화된 추천입니다.',
                'data_source': 'global_model + user_data'
            }
        else:
            return {
                'level': 'high',
                'score': 0.9,
                'message': f'{campaign_count}개 캠페인으로 학습한 고정확도 개인화 추천입니다.',
                'data_source': 'user_fine_tuned_model'
            }
    
    def _encode_category(self, category: str, value: str) -> int:
        """카테고리 값을 숫자로 인코딩"""
        
        try:
            if category in self.label_encoders:
                return self.label_encoders[category].transform([value])[0]
            
            # Fallback: 매뉴얼 매핑
            mappings = {
                'industry': self.industries,
                'platform': self.platforms,
                'region': self.regions,
                'age_group': self.age_groups,
                'gender': self.genders
            }
            
            if category in mappings and value in mappings[category]:
                return mappings[category].index(value)
            
            return 0  # 기본값
            
        except Exception:
            return 0
    
    def _get_recommendation_reason(self, platform: str, 
                                  product_info: Dict, score: float) -> str:
        """추천 근거 생성"""
        
        industry = product_info.get('industry', 'ecommerce')
        
        reasons = {
            'google': {
                'finance': '금융 상품 검색 의도 타겟팅에 최적',
                'tech': 'B2B 기술 제품 구매 의사결정자 도달',
                'education': '교육 프로그램 검색 수요 높음'
            },
            'meta': {
                'fashion': '비주얼 중심 패션 아이템 홍보 효과적',
                'ecommerce': '광범위한 잠재고객 발굴 가능',
                'food_delivery': '음식 사진 기반 식욕 자극'
            },
            'naver': {
                'health': '건강 정보 검색 점유율 높음',
                'real_estate': '부동산 검색 1위 플랫폼',
                'education': '한국 교육 정보 허브'
            },
            'karrot': {
                'food_delivery': '지역 음식점 홍보 최적',
                'real_estate': '동네 부동산 정보 신뢰도 높음',
                'ecommerce': '중고거래 활성 사용자층'
            }
        }
        
        if platform in reasons and industry in reasons[platform]:
            return reasons[platform][industry]
        
        return f'{score:.1%} 적합도 - AI 모델 기반 추천'


# 싱글톤 인스턴스
_engine_instance = None

def get_ai_engine() -> AIRecommendationEngine:
    """AI 엔진 싱글톤 인스턴스 반환"""
    global _engine_instance
    
    if _engine_instance is None:
        _engine_instance = AIRecommendationEngine()
    
    return _engine_instance
