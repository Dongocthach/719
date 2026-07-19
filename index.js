const UnityCloudCodeClient = require("./unityCloudCodeClient");

async function main() {
    const unity = new UnityCloudCodeClient();

    const result = await unity.callModuleFunction(
        "SayHello",
        {
            name: "thach"
        }
    );

    console.log("Cloud Code response:");
    console.dir(result, { depth: null });
}

main().catch((error) => {
    console.error("Request failed:");
    console.error(error);
    process.exitCode = 1;
});