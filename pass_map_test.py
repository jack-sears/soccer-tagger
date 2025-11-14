import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrow

# Load CSV
df = pd.read_csv("first407.csv")

# Filter only passes
passes = df[df['eventType'].str.lower() == 'Pass']

# Create figure and pitch
fig, ax = plt.subplots(figsize=(12, 8))

# Pitch dimensions (assuming 120x80, adjust if different)
pitch_length = 110
pitch_width = 75

# Draw pitch outline
ax.plot([0, pitch_length], [0,0], color="black")
ax.plot([0, pitch_length], [pitch_width,pitch_width], color="black")
ax.plot([0,0], [0,pitch_width], color="black")
ax.plot([pitch_length,pitch_length], [0,pitch_width], color="black")

# Optional: half line and penalty boxes
ax.plot([pitch_length/2, pitch_length/2], [0, pitch_width], color="black", linestyle="--")
ax.plot([0, 18], [pitch_width/2 + 18, pitch_width/2 + 18], color="black")
ax.plot([0, 18], [pitch_width/2 - 18, pitch_width/2 - 18], color="black")
ax.plot([pitch_length, pitch_length-18], [pitch_width/2 + 18, pitch_width/2 + 18], color="black")
ax.plot([pitch_length, pitch_length-18], [pitch_width/2 - 18, pitch_width/2 - 18], color="black")

# Loop through passes and plot arrows
for _, row in passes.iterrows():
    color = "green" if row['outcome'].lower() == 'success' else "red"
    ax.add_patch(FancyArrow(
        row['startX'], row['startY'],
        row['endX'] - row['startX'], row['endY'] - row['startY'],
        width=0.8, length_includes_head=True, head_width=2, color=color, alpha=0.7
    ))

# Labels and limits
ax.set_xlim(0, pitch_length)
ax.set_ylim(0, pitch_width)
ax.set_xlabel("X")
ax.set_ylabel("Y")
ax.set_title("Passing Map")
ax.set_aspect('equal')
plt.gca().invert_yaxis()  # optional, depending on how your coordinates are set
plt.show()
