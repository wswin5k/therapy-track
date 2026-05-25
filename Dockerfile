FROM node:24-trixie

WORKDIR /app

# Install git and essential tools that Expo or certain npm packages might require
RUN apt-get update && apt-get install -y \
    git \
    curl \
    # node_modules/\@react-native/debugger-shell/bin/react-native-devtools needs shared libraries of electron
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    libatspi2.0-0 \
    libdrm2 \
    libgbm1 \
    libasound2t64 \
    libxshmfence1 \
    libglu1-mesa \
    libxrandr2 \
    libxdamage1 \
    libxfixes3 \
    libxcomposite1 \
    libxcursor1 \
    libxi6 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libpango-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    && rm -rf /var/lib/apt/lists/*

# Fix directory ownership so the 'node' user can read/write to the app dir
RUN chown 1000:1000 /app

# Switch away from root user
USER node

# Copy package configurations
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY --chown=node:node . .

# Metro Bundler port
EXPOSE 8081

# Start the Expo development server
CMD ["npx", "expo", "start"]