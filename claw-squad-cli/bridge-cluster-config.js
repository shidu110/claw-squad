/**
 * Bridge Cluster Configuration
 * 
 * Copy this file to bridge-cluster-config.local.js and fill in your API keys.
 * bridge-cluster-config.local.js is gitignored.
 */

module.exports = {
  bridges: [
    {
      id: 'bridge-minimax',
      model: 'MiniMax-M2.7',
      cli: '../claw-squad-mcp/bridge.cjs',
      env: {
        CLAWSQUAD_MODEL: 'MiniMax-M2.7'
      }
    },
    {
      id: 'bridge-kimi',
      model: 'Kimi-K2.5',
      cli: '../claw-squad-mcp/bridge.cjs',
      env: {
        CLAWSQUAD_MODEL: 'Kimi-K2.5',
        SILICONFLOW_KIMI_API_KEY: process.env.SILICONFLOW_KIMI_API_KEY || 'your-kimi-key'
      }
    },
    {
      id: 'bridge-glm',
      model: 'GLM-5',
      cli: '../claw-squad-mcp/bridge.cjs',
      env: {
        CLAWSQUAD_MODEL: 'GLM-5',
        SILICONFLOW_GLM_API_KEY: process.env.SILICONFLOW_GLM_API_KEY || 'your-glm-key'
      }
    }
  ]
};
