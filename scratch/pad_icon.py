from PIL import Image
import os

assets_path = r"c:\Projects\Software Projects\AI-Powered-Ticket-Creation-and-Categorization-from-User-Input\MobileApp\assets"
logo_file = os.path.join(assets_path, "logo_v1.png")

print(f"Loading logo from: {logo_file}")

# Load original logo
img = Image.open(logo_file)
width, height = img.size
print(f"Original size: {width}x{height}")

# Scale original image down to 60% of its size to fit safe zone
scale_factor = 0.60
new_w = int(width * scale_factor)
new_h = int(height * scale_factor)
scaled_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

# Create a solid background image with color #0b1120 (R: 11, G: 17, B: 32)
bg_color = (11, 17, 32)
new_img = Image.new("RGB", (width, height), bg_color)

# Paste the scaled image in the center
offset_x = (width - new_w) // 2
offset_y = (height - new_h) // 2
new_img.paste(scaled_img, (offset_x, offset_y))

# Save the padded logo back to assets
new_img.save(os.path.join(assets_path, "logo_v1.png"), "PNG")
new_img.save(os.path.join(assets_path, "icon.png"), "PNG")
new_img.save(os.path.join(assets_path, "adaptive-icon.png"), "PNG")
new_img.save(os.path.join(assets_path, "splash-icon.png"), "PNG")

print("All icon assets padded and updated successfully!")
