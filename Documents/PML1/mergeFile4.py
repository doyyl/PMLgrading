import pandas as pd

# Read the Excel file
inputFile = '/Users/supavidhburimart/Documents/PML1/export/test/mergedFile_2024-06-01_10-14-59.xlsx'
df = pd.read_excel(inputFile)

# Create the list of months as column headers
months = [
    '2022-12', '2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06', '2023-07', '2023-08', '2023-09', 
    '2023-10', '2023-11', '2023-12', '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', 
    '2024-08', '2024-09', '2024-10', '2024-11', '2024-12', '2025-01'
]

# Add the column 'dataweek' with value 'thisweek'
df['dataweek'] = 'thisweek'

# Iterate through the months and add 'active' or 'inactive' based on conditions
for month in months:
    if (month + ' Open') in df.columns and (month + ' Closed') in df.columns:
        df[month] = 'Active'
    else:
        df[month] = 'Inactive'

# Write the DataFrame back to the Excel file
output_file = f"/Users/supavidhburimart/Documents/PML1/export/test/mergeFinal.xlsx"
df.to_excel(output_file, index=False)
