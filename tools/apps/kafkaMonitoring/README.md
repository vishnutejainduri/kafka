# setting up eslint for VSCODE
- https://medium.com/devityoself/monorepo-eslint-vscode-6f5982c8404d
    - CMD + Shift + P
    - Start to type Workspace settings
    - Search for ESlint extension and look for Working Directories and select Edit in settings.json
    - Enter the paths that need ESlint enabled
    - (optional) You may want to exclude your .vscode settings without using a .gitignore . In our setup there is not a .gitignore at the root level of the monorepo but I really dont want my IDE settings to find their way into source control. To fix this you can locally ignore files by following these steps: https://stackoverflow.com/questions/1753070/how-do-i-configure-git-to-ignore-some-files-locally

# deployment
- source deploy.sh
    - cd frontend && npm run build && rm -rf ../server/client && cp -R ./build ../server/client
    - cd .. && cd server && rm tsconfig.build.tsbuildinfo && npm run build
    - ibmcloud cf push