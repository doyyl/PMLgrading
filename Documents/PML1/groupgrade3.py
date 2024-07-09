import pandas as pd
from pandas.tseries.offsets import MonthEnd
from datetime import datetime

# Define the mapping dictionary based on the cleaned-up text
farm_name_mapping = {
    "Bangkachai1": "บางกะไชย1",
    "Bangsakao": "บางสระเก้า",
    "Bo Thong": "บ่อทอง",
    "CHBR1": "ซีเอชบีอาร์1",
    "Kamong": "โขมง",
    "Laemsing": "แหลมสิงห์1",
    "Lucky1": "ลักกี้1",
    "Lucky3": "ลักกี้3",
    "Rayong3": "ระยอง3",
    "Roiphet1": "ร้อยเพชร1",
    "Roiphet2": "ร้อยเพชร2",
    "Roiphet3": "ร้อยเพชร3",
    "Andaman": "อันดามัน",
    "Kanchanadit": "กาญจนดิษฐ์",
    "SR1": "เอสอาร์1",
    "SR4": "เอสอาร์4",
    "Nakornfarm": "นครฟาร์ม",
    "Pakpanang1": "ปากพนัง1",
    "Ranode": "ระโนด",
    "Bansang": "บ้านสร้าง",
    "Choknavy": "โชคนาวี",
    "Lamlaung": "แหลมหลวง",
    "Maeklong1": "แม่กลอง1",
    "Petchburi5": "เพชรบุรี5",
    "Roiphet1-A": "ร้อยเพชร1-โมดูลA",
    "Roiphet1-B": "ร้อยเพชร1-โมดูลB",
    "Roiphet1-C": "ร้อยเพชร1-โมดูลC",
    "Roiphet1-D": "ร้อยเพชร1-โมดูลD",
}

# Load the provided Excel files
inputFile = "/Users/supavidhburimart/Documents/PML1/export/29jun/byPond_2024-07-05_20-55-07.xlsx"
inputFile2023 = "/Users/supavidhburimart/Documents/PML1/neededData/pml_bypond2023.xlsx"

df1 = pd.read_excel(inputFile)
df2 = pd.read_excel(inputFile2023)

# Merge the DataFrames
merged_df = pd.concat([df1, df2], ignore_index=True)

current_datetime = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
merged_df.to_excel(
    f"/Users/supavidhburimart/Documents/PML1/export/29jun/mergedFile_{current_datetime}.xlsx",
    index=False,
)

# Drop rows with missing or invalid date values
merged_df["Month Open"] = pd.to_datetime(
    merged_df["Month Open"], dayfirst=True, errors="coerce"
)
merged_df["Month Closed"] = pd.to_datetime(
    merged_df["Month Closed"], dayfirst=True, errors="coerce"
)
merged_df = merged_df.dropna(subset=["Month Open", "Month Closed"])

# Ensure 'Month Open' and 'Month Closed' are at the end of the respective months
merged_df["Month Open"] = pd.to_datetime(
    merged_df["Month Open"], format="%Y-%m"
) + MonthEnd(0)
merged_df["Month Closed"] = pd.to_datetime(
    merged_df["Month Closed"], format="%Y-%m"
) + MonthEnd(0)

# Create a copy of the original farm names
merged_df["Original Farm"] = merged_df["Farm"]

# Rename 'Farm' column based on the mapping
merged_df["Farm"] = merged_df["Farm"].map(farm_name_mapping).fillna(merged_df["Farm"])

# Remove rows where the farm name hasn't changed
merged_df = merged_df[merged_df["Original Farm"] != merged_df["Farm"]]

# Remove the 'Original Farm' column
merged_df.drop(columns=["Original Farm"], inplace=True)

# Prepare data for aggregation
data_list = []

# Iterate through each unique Farm and Grade combination
for (farm, grade), group in merged_df.groupby(["Farm", "Grade"]):
    # Initialize counts for each month
    counts = {}

    # Count the occurrences for each month
    for _, row in group.iterrows():
        active_months = pd.date_range(
            start=row["Month Open"], end=row["Month Closed"], freq="M"
        ).to_period("M")
        for month in active_months:
            if month not in counts:
                counts[month] = 1
            else:
                counts[month] += 1

    # Prepare the row to be added
    row_data = {"Farm": farm, "Grade": grade}
    row_data.update({str(month): count for month, count in counts.items()})
    data_list.append(row_data)

# Create the DataFrame
output_df = pd.DataFrame(data_list)

# Reorder or ensure all expected columns are present, filling missing ones with 0
expected_months = pd.date_range(
    start=merged_df["Month Open"].min(), end=merged_df["Month Closed"].max(), freq="M"
).to_period("M")
expected_columns = ["Farm", "Grade"] + [str(month) for month in expected_months]
for col in expected_columns:
    if col not in output_df.columns:
        output_df[col] = 0

output_df = output_df[expected_columns]  # Reorder to match expected structure

# Remove columns that start with "2022"
columns_to_remove = [col for col in output_df.columns if col.startswith("2022")]
output_df.drop(columns=columns_to_remove, inplace=True)

# Add the 'dataweek' column with the value 'thisweek'
output_df["dataweek"] = "thisweek"

# Write the processed data to a new Excel file

output_file = f"/Users/supavidhburimart/Documents/PML1/export/29jun/GroupGrade_{current_datetime}.xlsx"
output_df.to_excel(output_file, index=False)

output_file
