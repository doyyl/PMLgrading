import pandas as pd
from datetime import datetime

# Load the Excel file into a DataFrame
file_path = "/Users/supavidhburimart/Documents/PML1/Data_Eff_2024-07-05.xlsx"
df = pd.read_excel(file_path)

# Define new headers based on the image provided
new_headers = [
    "Year",
    "Farm",
    "Pond",
    "Area (Rai)",
    "Closed Date",
    "DoC Culture",
    "Million Pcs",
    "Den (m3)",
    "Ton",
    "M-Yield Avg Ton",
    "M-Size Avg",
    "M-SR Avg",
    "MBW.",
    "M-ADG Avg",
    "M-FCR Avg",
    "Production Cost (Est)  (/Kg)",
    "STD Cost (/kg)",
    "Diff_STD",
    "Pond Type",
    "Stocking Date",
]

# Check if the number of new headers matches the number of columns
if len(new_headers) != df.shape[1]:
    raise ValueError(
        "Number of new headers does not match the number of columns in the DataFrame"
    )

# Assign new headers to the DataFrame
df.columns = new_headers

# Create a mapping of Thai farm names to their English equivalents
farm_name_mapping = {
    "บางกะไชย1": "Bangkachai1",
    "บางสระเก้า": "Bangsakao",
    "บ่อทอง": "Bo Thong",
    "ซีเอชบีอาร์1": "CHBR1",
    "โขมง": "Kamong",
    "แหลมสิงห์1": "Laemsing",
    "ลักกี้1": "Lucky1",
    "ลักกี้3": "Lucky3",
    "ระยอง3": "Rayong3",
    "ร้อยเพชร1": "Roiphet1",
    "ร้อยเพชร2": "Roiphet2",
    "ร้อยเพชร3": "Roiphet3",
    "อันดามัน": "Andaman",
    "กาญจนดิษฐ์": "Kanchanadit",
    "เอสอาร์1": "SR1",
    "เอสอาร์4": "SR4",
    "นครฟาร์ม": "Nakornfarm",
    "ปากพนัง1": "Pakpanang1",
    "ระโนด": "Ranode",
    "บ้านสร้าง": "Bansang",
    "โชคนาวี": "Choknavy",
    "แหลมหลวง": "Lamlaung",
    "แม่กลอง1": "Maeklong1",
    "เพชรบุรี5": "Petchburi5",
    "ร้อยเพชร1-โมดูลA": "Roiphet1-A",
    "ร้อยเพชร1-โมดูลB": "Roiphet1-B",
    "ร้อยเพชร1-โมดูลC": "Roiphet1-C",
    "ร้อยเพชร1-โมดูลD": "Roiphet1-D",
}

# Replace the values in the "Farm" column based on the mapping
df["Farm"] = df["Farm"].map(farm_name_mapping)

# Function to update Farm column based on Pond column
def update_farm(row):
    if row["Farm"] == "Roiphet1" and pd.notna(row["Pond"]):
        pond_start = row["Pond"].strip().upper()
        if pond_start.startswith("A"):
            return "Roiphet1-A"
        elif pond_start.startswith("B"):
            return "Roiphet1-B"
        elif pond_start.startswith("C"):
            return "Roiphet1-C"
        elif pond_start.startswith("D"):
            return "Roiphet1-D"
    return row["Farm"]


# Apply the function to update the "Farm" column
df["Farm"] = df.apply(update_farm, axis=1)

# Multiply the values in the "M-SR Avg" column by 100
df["M-SR Avg"] = df["M-SR Avg"] * 100

# Get the current datetime
current_datetime = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

# Save the DataFrame back to an Excel file with a datetime-based name
new_filename = (
    f"/Users/supavidhburimart/Documents/PML1/export/29jun/dataEff_{current_datetime}.xlsx"
)
df.to_excel(new_filename, index=False)

print(f"File saved as {new_filename}")
