from app.utils.tariff import calculate_cesc_bill

print("=" * 60)
print("Testing CESC Tariff Calculator")
print("=" * 60)

# Scenario A: B Bani Das's actual bill numbers (8 units, let's try with 1 month and 2 months billing cycles)
print("Scenario 1: 8 Units Consumed, 1 Month billing cycle:")
res1 = calculate_cesc_bill(8, 1)
for k, v in res1.items():
    print(f"  {k}: {v}")

print("-" * 40)
print("Scenario 2: 8 Units Consumed, 2 Months billing cycle:")
res2 = calculate_cesc_bill(8, 2)
for k, v in res2.items():
    print(f"  {k}: {v}")

print("-" * 40)
print("Scenario 3: 200 Units Consumed, 1 Month billing cycle (Standard G Slabs):")
res3 = calculate_cesc_bill(200, 1)
for k, v in res3.items():
    print(f"  {k}: {v}")
print("=" * 60)
