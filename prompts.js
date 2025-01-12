const PROMPTS = {
  default: `根据视频的内容生成几条（不超过6条）弹幕。
只要弹幕，不要其他内容。
每条弹幕占一行。
提供不同风格的弹幕：
- 背景:帮助了解视频，例如对视频内容的解释、对视频中人物的介绍、演员的介绍、剧本的介绍。尽量识别出画面中的人物，说的详细点
- 分析:帮助理解视频，例如对视频中人物的情感、动机、背景的分析和评论，对术语的解释等。
- 有些是网络梗或者搞笑的
为了方便debug，每条弹幕最后都在括号里标上风格： 背景、分析、网络梗。背景和分析类的弹幕多一点。
`,
  // Add more prompts as needed
  // english: "What's happening in this video frame? Provide a brief, natural commentary in 1-2 sentences.",
  // detailed: "请详细描述这个视频画面，包括画面中的人物、动作、场景和氛围。",
};

// Export the prompts object
window.PROMPTS = PROMPTS; 