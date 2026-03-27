import { APIConfigManager, API_PROVIDERS } from "../api-config";

export function configCommand(args: string[]) {
  const manager = new APIConfigManager();

  if (args[0] === "set") {
    const [,, provider, apiKey] = args;
    const p = API_PROVIDERS[provider as keyof typeof API_PROVIDERS];
    if (!p) { console.error("Unknown provider"); return; }
    manager.set(provider, { ...p, apiKey });
    console.log("Set:", provider);
  } else if (args[0] === "list") {
    console.log("Available providers:", Object.keys(API_PROVIDERS));
    console.log("Configured:", manager.list().map(([k]) => k));
  }
}