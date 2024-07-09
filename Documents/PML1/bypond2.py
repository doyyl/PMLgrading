import pandas as pd
from datetime import datetime

raw_data = pd.read_excel("/Users/supavidhburimart/Documents/PML1/export/29jun/dataEff_2024-07-05_20-54-47.xlsx")

std_data = pd.read_excel("/Users/supavidhburimart/Documents/PML1/neededData/std.xlsx")

farm_zone_data = pd.read_excel(
    "/Users/supavidhburimart/Documents/PML1/neededData/Farm_Zone.xlsx"
)


raw_column_mappings = {
    "Farm": "Farm_Name",
    "Pond": "Pond",
    "Pond Type": "Pond_Type",
    "Million Pcs": "Mill_Pcs",
    "Den (m3)": "Den_m3",
    "Closed Date": "Closed_Date",
    "Stocking Date": "Open_Date",
    "DoC Culture": "DoC",
    "Ton": "Ton",
    "M-Yield Avg Ton": "Yield_TonRai",
    "M-Size Avg": "Avg_Size",
    "M-SR Avg": "SR",
    "M-ADG Avg": "ADG_g",
    "M-FCR Avg": "FCR",
    "Production Cost (Est)  (/Kg)": "Prod_Cost_kg",
    "STD Cost (/kg)": "STD_Cost_kg",
    "Area (Rai)": "Rai",
}

std_column_mappings = {
    "DOC": "DOC",
    "SIZE": "SIZE",
    "SR": "SR",
    "FCR acc": "FCR_acc",
    "ADG acc": "ADG_acc",
}


input_data = pd.DataFrame()

for old_name, new_name in raw_column_mappings.items():
    input_data[new_name] = raw_data[old_name]

input_data["Farm-Zone"] = (
    input_data["Farm_Name"] + "-" + input_data["Pond"].astype(str).str[:2]
)  # กำหนดโซน
input_data["Farm-Pond"] = input_data["Farm_Name"] + "-" + input_data["Pond"]  # กำหนดบ่อ

std_input_data = pd.DataFrame()

for old_name, new_name in std_column_mappings.items():
    std_input_data[new_name] = std_data[old_name]

input_data = input_data.merge(
    farm_zone_data, left_on="Farm_Name", right_on="Farm_Eng_Name", how="left"
)  # join thai eng name


def calculate_calculated_SR_and_std(row, std_input_data):
    if pd.isna(row["Avg_Size"]) or pd.isna(row["SR"]):
        return (0, "No Avg Size or SR")

    rounded_avg_size = round(row["Avg_Size"])  # ปัดเศษ

    std_sr = std_input_data.loc[
        std_input_data["SIZE"] == rounded_avg_size, "SR"
    ]  # หาsizeในstd data
    if not std_sr.empty:
        return (row["SR"] / std_sr.iloc[0], std_sr.iloc[0] / 100)  # 2ค่า
    else:
        return ("No Std SR found", "No Std SR found")


input_data[["calculated_SR", "Standard_SR"]] = (
    input_data.apply(
        lambda row: calculate_calculated_SR_and_std(row, std_input_data), axis=1
    ).apply(pd.Series)
    * 100
)


def calculate_calculated_ADG_and_std(row, std_input_data):
    if pd.isna(row["Avg_Size"]) or pd.isna(row["ADG_g"]):
        return (0, "No Avg Size or ADG")

    rounded_avg_size = round(row["Avg_Size"])

    std_adg = std_input_data.loc[std_input_data["SIZE"] == rounded_avg_size, "ADG_acc"]
    if not std_adg.empty:
        return (row["ADG_g"] / std_adg.iloc[0], std_adg.iloc[0] / 100)
    else:
        return ("No Std ADG found", "No Std ADG found")


input_data[["calculated_ADG", "Standard_ADG"]] = (
    input_data.apply(
        lambda row: calculate_calculated_ADG_and_std(row, std_input_data), axis=1
    ).apply(pd.Series)
    * 100
)


def calculate_calculated_FCR_and_std(row, std_input_data):
    if pd.isna(row["Avg_Size"]) or pd.isna(row["FCR"]):
        return (0, "No Avg Size or FCR")

    rounded_avg_size = round(row["Avg_Size"])

    std_fcr = std_input_data.loc[std_input_data["SIZE"] == rounded_avg_size, "FCR_acc"]
    if not std_fcr.empty:
        return (2 - (row["FCR"] / std_fcr.iloc[0]), std_fcr.iloc[0] / 100)
    else:
        return ("No Std FCR found", "No Std FCR found")


input_data[["calculated_FCR", "Standard_FCR"]] = (
    input_data.apply(
        lambda row: calculate_calculated_FCR_and_std(row, std_input_data), axis=1
    ).apply(pd.Series)
    * 100
)


def calculate_std_yield(pond_type, den_m3):
    if pond_type == "Outdoor":
        model_ranges = [
            (0, 110, 6.806),
            (111, 135, 7.353),
            (136, 165, 9.2),
            (166, 190, 10.247),
            (191, float("inf"), 11.259),
        ]
    elif pond_type == "Greenhouse":
        model_ranges = [(0, 165, 9.2), (166, 190, 10.247), (191, float("inf"), 11.259)]
    else:
        return None

    for min_den, max_den, yield_ton_rai in model_ranges:
        if min_den <= den_m3 <= max_den:
            return yield_ton_rai

    return None


def calculate_calculated_Yield(row):
    if pd.isna(row["Yield_TonRai"]) or pd.isna(row["Den_m3"]):
        return 0
    std_yield = calculate_std_yield(row["Pond_Type"], row["Den_m3"])
    if std_yield is not None:
        return (row["Yield_TonRai"] / std_yield, std_yield)

    else:
        return "No Std Yield found"


input_data[["calculated_Yield", "Standard_Yield"]] = input_data.apply(
    calculate_calculated_Yield, axis=1, result_type="expand"
)
input_data["calculated_Yield"] = input_data["calculated_Yield"] * 100


def calculate_cost_saving(row):
    if pd.isna(row["STD_Cost_kg"]) or pd.isna(row["Prod_Cost_kg"]):
        return 0

    if row["STD_Cost_kg"] == 0:
        return 0

    return (row["STD_Cost_kg"] - row["Prod_Cost_kg"]) / row["STD_Cost_kg"]


input_data["cost_saving"] = input_data.apply(calculate_cost_saving, axis=1) * 100


def calculate_cost_saving000(row):
    if pd.isna(row["STD_Cost_kg"]) or pd.isna(row["Prod_Cost_kg"]):
        return 0

    if row["STD_Cost_kg"] == 0:
        return 0

    return row["STD_Cost_kg"] - row["Prod_Cost_kg"]
    # return ((row['STD_Cost_kg'] - row['Prod_Cost_kg'])*row['Ton'] *1000)


input_data["cost_saving000"] = input_data.apply(calculate_cost_saving000, axis=1)
input_data["Mill_Pcs"] = pd.to_numeric(
    input_data["Mill_Pcs"], errors="coerce"
)  # แปลงให้เปนเลขทั้งหมด
input_data["DoC"] = pd.to_numeric(input_data["DoC"], errors="coerce")
input_data["Ton"] = pd.to_numeric(input_data["Ton"], errors="coerce")
input_data["calculated_SR"] = pd.to_numeric(
    input_data["calculated_SR"], errors="coerce"
)
input_data["calculated_ADG"] = pd.to_numeric(
    input_data["calculated_ADG"], errors="coerce"
)
input_data["calculated_FCR"] = pd.to_numeric(
    input_data["calculated_FCR"], errors="coerce"
)
input_data["calculated_Yield"] = pd.to_numeric(
    input_data["calculated_Yield"], errors="coerce"
)
input_data["cost_saving"] = pd.to_numeric(input_data["cost_saving"], errors="coerce")
input_data["Avg_Size"] = pd.to_numeric(input_data["Avg_Size"], errors="coerce")

input_data["Weighted_SR"] = input_data["calculated_SR"] * input_data["Mill_Pcs"]  # ถ่วง
input_data["Weighted_ADG"] = input_data["calculated_ADG"] * input_data["Ton"]
input_data["Weighted_FCR"] = input_data["calculated_FCR"] * input_data["Ton"]
input_data["Weighted_Yield"] = input_data["calculated_Yield"] * input_data["Ton"]
input_data["Weighted_Cost"] = input_data["cost_saving"] * input_data["Ton"]
input_data["Weighted_Avg_Size"] = input_data["Avg_Size"] * input_data["Ton"]


def group_and_calculate_weighted_avg(
    input_data, area_group="Farm", time_group="monthly"
):
    input_data["Closed_Date"] = pd.to_datetime(
        input_data["Closed_Date"]
    )  # เปลี่ยนเปนเวลา

    if time_group == "weekly":
        input_data["Week"] = input_data["Closed_Date"].dt.to_period("W-TUE")
        time_col = "Week"
    elif time_group == "yearly":
        input_data["Year"] = input_data["Closed_Date"].dt.to_period("Y")
        time_col = "Year"
    else:
        input_data["Month"] = input_data["Closed_Date"].dt.to_period("M")
        time_col = "Month"

    if area_group == "Region":
        area_col = "Region"
    elif area_group == "Region_Details":
        area_col = "Region_Details"
    elif area_group == "Resp_Pers":
        area_col = "Resp_Pers"
    elif area_group == "Farm-Zone":
        area_col = "Farm-Zone"
    elif area_group == "Farm-Pond":
        area_col = "Farm-Pond"
    else:
        area_col = "Farm_Name"

    group_cols = [area_col, time_col]  # กำหนด group by

    ##ถ่วงรวม
    weighted_avgs = (
        input_data.groupby(group_cols)
        .apply(
            lambda df: pd.Series(
                {
                    "Avg_SR": df["Weighted_SR"].sum() / df["Mill_Pcs"].sum(),
                    "Avg_ADG": df["Weighted_ADG"].sum() / df["Ton"].sum(),
                    "Avg_FCR": df["Weighted_FCR"].sum() / df["Ton"].sum(),
                    "Avg_Yield": df["Weighted_Yield"].sum() / df["Ton"].sum(),
                    "Avg_Cost": df["Weighted_Cost"].sum() / df["Ton"].sum(),
                    "Avg_Size": df["Weighted_Avg_Size"].sum() / df["Ton"].sum(),
                    "Date_Range": f"{df['Closed_Date'].min().date()} - {df['Closed_Date'].max().date()}",
                    "Sum_Ton": df["Ton"].sum(),
                    "Saving_000": (df["cost_saving000"] * df["Ton"]).sum(),
                    "Saving_kg": (df["cost_saving000"] * df["Ton"]).sum()
                    / df["Ton"].sum(),
                }
            )
        )
        .reset_index()
    )

    return weighted_avgs


monthly_avg = group_and_calculate_weighted_avg(
    input_data, area_group="Farm-Pond", time_group="Month"
)


def score_cost(
    value,
    min_score=-40,
    mid_score=0,
    max_score=40,
    min_value=-100,
    mid_value=0,
    max_value=30,
):
    if value <= min_value:
        return min_score
    elif value >= max_value:
        return max_score
    elif value == mid_value:
        return mid_score
    else:
        if value < mid_value:
            score_range = mid_score - min_score
            value_range = mid_value - min_value
            return (value - min_value) * score_range / value_range + min_score
        else:
            score_range = max_score - mid_score
            value_range = max_value - mid_value
            return (value - mid_value) * score_range / value_range + mid_score


def score_sr(
    value,
    min_score=-15,
    mid_score=0,
    max_score=15,
    min_value=60,
    mid_value=90,
    max_value=100,
):
    if value <= min_value:
        return min_score
    elif value >= max_value:
        return max_score
    elif value == mid_value:
        return mid_score
    else:
        if value < mid_value:
            score_range = mid_score - min_score
            value_range = mid_value - min_value
            return (value - min_value) * score_range / value_range + min_score
        else:
            score_range = max_score - mid_score
            value_range = max_value - mid_value
            return (value - mid_value) * score_range / value_range + mid_score


def score_adg(
    value,
    min_score=-15,
    mid_score=0,
    max_score=15,
    min_value=60,
    mid_value=80,
    max_value=120,
):
    if value <= min_value:
        return min_score
    elif value >= max_value:
        return max_score
    elif value == mid_value:
        return mid_score
    else:
        if value < mid_value:
            score_range = mid_score - min_score
            value_range = mid_value - min_value
            return (value - min_value) * score_range / value_range + min_score
        else:
            score_range = max_score - mid_score
            value_range = max_value - mid_value
            return (value - mid_value) * score_range / value_range + mid_score


def score_fcr(
    value,
    min_score=-10,
    mid_score=0,
    max_score=10,
    min_value=60,
    mid_value=80,
    max_value=120,
):
    if value <= min_value:
        return min_score
    elif value >= max_value:
        return max_score
    elif value == mid_value:
        return mid_score
    else:
        if value < mid_value:
            score_range = mid_score - min_score
            value_range = mid_value - min_value
            return (value - min_value) * score_range / value_range + min_score
        else:
            score_range = max_score - mid_score
            value_range = max_value - mid_value
            return (value - mid_value) * score_range / value_range + mid_score


def score_yield(
    value,
    min_score=-10,
    mid_score=0,
    max_score=10,
    min_value=60,
    mid_value=80,
    max_value=120,
):
    if value <= min_value:
        return min_score
    elif value >= max_value:
        return max_score
    elif value == mid_value:
        return mid_score
    else:
        if value < mid_value:
            score_range = mid_score - min_score
            value_range = mid_value - min_value
            return (value - min_value) * score_range / value_range + min_score
        else:
            score_range = max_score - mid_score
            value_range = max_value - mid_value
            return (value - mid_value) * score_range / value_range + mid_score


def score_avg_size(
    value,
    min_score=-10,
    mid_score=0,
    max_score=10,
    max_value=30,
    mid_value=40,
    min_value=50,
):
    if value >= min_value:
        return min_score
    elif value <= max_value:
        return max_score
    elif value == mid_value:
        return mid_score
    else:
        if value > mid_value:
            score_range = mid_score - min_score
            value_range = min_value - mid_value
            return (min_value - value) * score_range / value_range + min_score
        else:
            score_range = max_score - mid_score
            value_range = mid_value - max_value
            return (mid_value - value) * score_range / value_range + mid_score


monthly_avg["Cost_Score"] = monthly_avg["Avg_Cost"].apply(score_cost)
monthly_avg["SR_Score"] = monthly_avg["Avg_SR"].apply(score_sr)
monthly_avg["ADG_Score"] = monthly_avg["Avg_ADG"].apply(score_adg)
monthly_avg["FCR_Score"] = monthly_avg["Avg_FCR"].apply(score_fcr)
monthly_avg["Yield_Score"] = monthly_avg["Avg_Yield"].apply(score_yield)
monthly_avg["Avg_Size_Score"] = (
    monthly_avg["Avg_Size"].apply(score_avg_size)
    if "Avg_Size" in monthly_avg.columns
    else None
)

monthly_avg["final_score"] = (
    monthly_avg["Cost_Score"]
    + monthly_avg["SR_Score"]
    + monthly_avg["ADG_Score"]
    + monthly_avg["FCR_Score"]
    + monthly_avg["Yield_Score"]
    + monthly_avg["Avg_Size_Score"]
)


def grade_from_final_score(
    value, a_score=60, b_plus_score=30, b_score=0, c_plus_score=-30, c_score=-60
):
    if value >= a_score:
        return "A"
    elif value >= b_plus_score:
        return "B+"
    elif value >= b_score:
        return "B"
    elif value >= c_plus_score:
        return "C+"
    elif value >= c_score:
        return "C"
    else:
        return "D"


monthly_avg["Grade"] = monthly_avg["final_score"].apply(grade_from_final_score)

data_for_merge = pd.DataFrame()
data_for_merge["Farm-Pond"] = input_data["Farm-Pond"]

data_for_merge["Farm"] = input_data["Farm_Name"]
data_for_merge["Pond"] = input_data["Pond"]

data_for_merge["SR_Act"] = input_data["SR"]
data_for_merge["ADG_Act"] = input_data["ADG_g"]
data_for_merge["FCR_Act"] = input_data["FCR"]
data_for_merge["Yield_Act"] = input_data["Yield_TonRai"]
data_for_merge["Production_cost"] = input_data["Prod_Cost_kg"]

data_for_merge["SR_Std"] = input_data["Standard_SR"]
data_for_merge["ADG_Std"] = input_data["Standard_ADG"]
data_for_merge["FCR_Std"] = input_data["Standard_FCR"]
data_for_merge["Yield_Std"] = input_data["Standard_Yield"]
data_for_merge["Cost_Std"] = input_data["STD_Cost_kg"]

data_for_merge["SR_VS_std"] = input_data["calculated_SR"]
data_for_merge["ADG_VS_std"] = input_data["calculated_ADG"]
data_for_merge["FCR_VS_std"] = input_data["calculated_FCR"]
data_for_merge["Yield_VS_std"] = input_data["calculated_Yield"]
data_for_merge["Month Open"] = input_data["Open_Date"]
data_for_merge["Month Closed"] = input_data["Closed_Date"]

monthly_avg = monthly_avg.merge(
    data_for_merge, left_on="Farm-Pond", right_on="Farm-Pond", how="left"
)

current_datetime = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

monthly_avg.to_excel(
    f"/Users/supavidhburimart/Documents/PML1/export/29jun/byPond_{current_datetime}.xlsx",
    index=False,
)

input_data["Farm-Pond"]
monthly_avg = monthly_avg.merge(
    input_data, left_on="Farm-Pond", right_on="Farm-Pond", how="left"
)
monthly_avg
