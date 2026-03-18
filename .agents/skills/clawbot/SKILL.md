---
name: clawdbot
description: "Allows the Clawdbot agent to execute automated tasks, manage multi-agent workflows, and interact with the environment using Node.js, Python, and blockchain protocols."
---

This Skill is intended for any operation that requires the agent to:

- Run shell or system commands.
- Access and manage installed software or dependencies.
- Interact with Solana, Ethereum (EVM), or other blockchain networks.
- Launch or coordinate sub-agents, including 3D AI assistants.
- Automate repetitive workflows, tasks, or research operations.

Use this Skill whenever the agent needs to perform **programmatic control of the environment** or orchestrate multiple processes in a coordinated manner.

1. **Environment Setup**  
   Ensure the agent is running in a pre-configured environment with:  
   - Node.js installed (v22+ recommended).  
   - Python 3.11+ with required packages.  
   - Solana CLI and/or EVM tools (Hardhat, ethers.js).  
   - Any necessary API keys or RPC URLs exported as environment variables.  

2. **Executing Commands**  
   Use this Skill to run commands directly within the environment:  
   ```bash
   node ./servers/terminal/index.js
   python3 ./servers/automation/main.py
   node ./servers/assistant-3d/index.js
   ```
