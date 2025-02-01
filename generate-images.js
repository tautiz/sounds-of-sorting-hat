const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Ensure images directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

// Generate a simple icon with text
async function generateIcon(size) {
    const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <text x="50%" y="50%" font-family="Arial" font-size="${size * 0.6}" 
              font-weight="bold" fill="white" text-anchor="middle" 
              dominant-baseline="middle">H</text>
        <rect x="${size * 0.1}" y="${size * 0.1}" 
              width="${size * 0.8}" height="${size * 0.8}" 
              fill="none" stroke="#740001" stroke-width="${size * 0.05}"/>
    </svg>`;

    await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(path.join(imagesDir, `icon-${size}x${size}.png`));
    
    console.log(`Generated ${size}x${size} icon`);
}

// Generate a screenshot with house buttons
async function generateScreenshot(width, height, isDesktop = true) {
    const padding = isDesktop ? 20 : 10;
    const cols = 2;
    const rows = 2;
    const buttonWidth = (width - (padding * (cols + 1))) / cols;
    const buttonHeight = (height - (padding * (rows + 1))) / rows;

    const houses = [
        { name: 'Gryffindor', color: '#740001' },
        { name: 'Slytherin', color: '#1a472a' },
        { name: 'Ravenclaw', color: '#0e1a40' },
        { name: 'Hufflepuff', color: '#ecb939' }
    ];

    let svgButtons = '';
    houses.forEach((house, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = padding + (col * (buttonWidth + padding));
        const y = padding + (row * (buttonHeight + padding));

        svgButtons += `
            <rect x="${x}" y="${y}" width="${buttonWidth}" height="${buttonHeight}" 
                  fill="${house.color}"/>
            <text x="${x + buttonWidth/2}" y="${y + buttonHeight/2}" 
                  font-family="Arial" font-size="${isDesktop ? 32 : 24}" 
                  font-weight="bold" fill="white" text-anchor="middle" 
                  dominant-baseline="middle">${house.name}</text>
        `;
    });

    const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#1a1a1a"/>
            ${svgButtons}
        </svg>
    `;

    const filename = isDesktop ? 'screenshot-desktop.png' : 'screenshot-mobile.png';
    await sharp(Buffer.from(svg))
        .resize(width, height)
        .png()
        .toFile(path.join(imagesDir, filename));
    
    console.log(`Generated ${filename}`);
}

async function generateAllImages() {
    try {
        // Generate icons
        await Promise.all([144, 192, 512].map(size => generateIcon(size)));

        // Generate screenshots
        await generateScreenshot(1920, 1080, true);  // Desktop
        await generateScreenshot(1080, 1920, false); // Mobile

        console.log('All images generated successfully!');
    } catch (error) {
        console.error('Error generating images:', error);
    }
}

generateAllImages();
