# .devcontainer/devcontainer.Dockerfile

# Use the feature-rich Universal Image. Git and essential tools are pre-installed here.
FROM mcr.microsoft.com/devcontainers/universal:latest

# Set the workspace directory
WORKDIR /workspaces

# Command to keep the container running so VS Code can stay attached
CMD [ "/bin/bash", "-c", "while sleep 1000; do :; done" ]