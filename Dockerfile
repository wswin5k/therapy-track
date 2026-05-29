FROM node:24-trixie AS base

# Set environment variables for Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/build-tools/36.0.0

WORKDIR /app

# Install system dependencies, Java 17 (required for Gradle/Android), and SDK tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    unzip \
    # needed so editor can connect to the container environment
    openssh-server \
    # needed to install openjdk 17 TODO update JDK, when possible
    gpg \
    apt-transport-https \
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

# Install OpenJDK 17 TODO update JDK, when possible
RUN wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | \
  gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg && \
  echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb trixie main" | \
  tee /etc/apt/sources.list.d/adoptium.list && \
  apt-get update && apt-get install -y temurin-17-jdk

# Download and install Android Command Line Tools
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools && \
    wget https://dl.google.com/android/repository/commandlinetools-linux-14742923_latest.zip -O /tmp/cmdline.zip && \
    unzip /tmp/cmdline.zip -d ${ANDROID_HOME}/cmdline-tools && \
    mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest && \
    rm /tmp/cmdline.zip

# Accept licenses and install platform tools, build tools, and platforms
RUN yes | sdkmanager --licenses && \
    sdkmanager "platform-tools" "build-tools;36.0.0" "platforms;android-36"

# Set up global npm permissions for the unprivileged node user
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=${PATH}:/home/node/.npm-global/bin

RUN mkdir -p /app \
             ${ANDROID_HOME} \
             /home/node/.gradle \
             /home/node/.android \
             /home/node/.npm-global
RUN chown -R 1000:1000 /app ${ANDROID_HOME} /home/node/.gradle /home/node/.android /home/node/.npm-global

USER node

# Pre-install global Expo tools
RUN npm install -g expo-cli

COPY --chown=node:node package*.json ./
RUN npm install

COPY --chown=node:node . .

FROM base AS expo-server

EXPOSE 8081

CMD ["npx", "expo", "start"]

# this stage purpose is to enable code editor use container environment
FROM base AS expo-sshd

RUN ssh-keygen -t ed25519 -f $HOME/ssh_host_ed25519_key

RUN mkdir -p $HOME/.ssh && cat ssh/expo-container.pub > $HOME/.ssh/authorized_keys

COPY <<EOF $HOME/sshd_config
Port 50022
ListenAddress 0.0.0.0

HostKey /home/node/ssh_host_ed25519_key

PidFile /home/node/sshd-run/sshd.pid

UsePAM no
PasswordAuthentication no
PubkeyAuthentication yes

AuthorizedKeysFile /home/node/.ssh/authorized_keys

Subsystem sftp internal-sftp
EOF

EXPOSE 50022

CMD ["/usr/sbin/sshd", "-D", "-f", "$HOME/sshd_config"]
