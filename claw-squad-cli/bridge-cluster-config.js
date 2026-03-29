/**
 * Bridge Cluster 配置示例
 * 
 * 定义多模型 Bridge 集群
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
        CLAWSQUAD_API_KEY: 'sk-dxnsxyfhiksvfsibytbrurcvlehmalgkohcmirvgjlymyspd'
      }
    },
    {
      id: 'bridge-glm',
      model: 'GLM-5',
      cli: '../claw-squad-mcp/bridge.cjs',
      env: {
        CLAWSQUAD_MODEL: 'GLM-5',
        CLAWSQUAD_API_KEY: 'sk-cvivauojemdaqukyfpeqdjenekgsdiouztcjovtcuvpvkveu'
      }
    }
  ]
};
