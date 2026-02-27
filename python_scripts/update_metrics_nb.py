import nbformat as nbf

try:
    with open('ai_experiments.ipynb', 'r', encoding='utf-8') as f:
        nb = nbf.read(f, as_version=4)

    for i, cell in enumerate(nb.cells):
        if cell.cell_type == 'code' and 'RandomForestClassifier' in cell.source:
            # Check if precision is already imported
            if 'precision_score' not in cell.source:
                # Replace import
                cell.source = cell.source.replace(
                    "from sklearn.metrics import accuracy_score",
                    "from sklearn.metrics import accuracy_score, precision_score, recall_score"
                )
                
                # Replace evaluation block
                old_block = """\
    # 정확도 평가
    y_pred_rf = rf_model.predict(X_test_rf)
    acc = accuracy_score(y_test_rf, y_pred_rf)
    
    print(f"✅ Random Forest 매체 추천 모델 학습 완료!")
    print(f"📊 모델 정확도: {acc:.2f}")"""
                
                new_block = """\
    # 정확도 평가
    y_pred_rf = rf_model.predict(X_test_rf)
    acc = accuracy_score(y_test_rf, y_pred_rf)
    precision = precision_score(y_test_rf, y_pred_rf, average='weighted', zero_division=0)
    recall = recall_score(y_test_rf, y_pred_rf, average='weighted', zero_division=0)
    
    print(f"✅ Random Forest 매체 추천 모델 학습 완료!")
    print(f"📊 모델 정확도: {acc:.2f}")
    print(f"📊 모델 정밀도(Precision): {precision:.2f}")
    print(f"📊 모델 재현율(Recall): {recall:.2f}")"""
                
                cell.source = cell.source.replace(old_block, new_block)

    with open('ai_experiments.ipynb', 'w', encoding='utf-8') as f:
        nbf.write(nb, f)
        
    print("Notebook update success")
except Exception as e:
    print(e)
