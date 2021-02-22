# Toolchain
## How it Works
### Step 1
The toolchain will start by fetching all connector configs in `hr-platform`, under `/kafkaConnectDeployment/connectors/`. It will log out everything it finds here. Every connector config found here will be deployed by the toolchain

### Step 2
The toolchain will then fetch all currently running connectors in kafka connect for the specified environment.

### Step 3
It will then find the "diff" between Step 1 and Step 2. NOTE: It will do this based on "id" inside the connector config not based on name
1. Any connector that exists in Step 1 and Step 2 BUT has a version older than the matching one in Step 2 will simply be ignored. A message will be logged as a warning
2. Any connector in Step 2 that either exists or doesn't exist in Step 1 wil be added to a deletion list
3. Any connector in Step 1 that either doesn't exist in Step 2 or does exist but has an equal to or greater version number will be added to a creation list
NOTE: Since as part of 3. we match whether it exists or not, we will delete and recreate all connectors everytime even if they are not new/updated ones

### Step 4
We will create and delete topics based on what is present in the creation and deletion list from Step 3. 

### Step 5
We run an asynchronous deletion based on the deletion list from Step 3

### Step 6
We run an asynchronous creation based on the creation list from Step 3

### Step 7
We run validation on any errors from Step 5. We run this after creation so as to not end up in a scenario where we delete many connectors but not create any at all. If any errors are encountered the toolchain stops and fails

### Step 8
For Step 6 we don't run validation like in Step 7, this is because the kafka connect api may be misleading. It can return error responses on api timeouts but successfully create the connector. For this reason we run one final validation in this step. We fetch all running connectors and their running status. We make sure they match the creation list and that they are all in RUNNING status. If any of this is not true deployment must have failed so the toolchain fails

### Step 9
Profit
