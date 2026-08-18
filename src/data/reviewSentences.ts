// 练过的句子（复习面板数据源）
// 来源：WorkBuddy 桌面端练过的场景对话复盘（问路/海滩/做饭/超市/自驾游/晨间brunch/城市探索）
// 用途：手机地铁上打开工作台英语页「AI教练」卡即可朗读复习，无需 API key。

export interface ReviewGroup {
  scene: string
  sentences: string[]
}

export const REVIEW_SENTENCES: ReviewGroup[] = [
  {
    scene: '🚏 问路',
    sentences: [
      'Excuse me, how can I get to the nearest mall?',
      'Go straight, then turn right at the intersection.',
      "It's across from the parking area, between the two buildings.",
      "It's about a ten-minute walk — you can easily walk there.",
    ],
  },
  {
    scene: '🏖️ 海滩租装备',
    sentences: [
      'Can you make it cheaper if I rent both?',
      'Do I need to pay a deposit?',
      "You'll get it back when you return the gear.",
    ],
  },
  {
    scene: '🍳 做饭',
    sentences: [
      "I'm cutting lemons and stirring the pot.",
      "I'll set the table and squeeze the lemons.",
      "I can't cook, but I poured the milk.",
    ],
  },
  {
    scene: '🛒 超市采购',
    sentences: [
      "I'm looking for milk and eggs.",
      'Where can I find them? Are they on sale?',
      'Can I pay with Alipay?',
    ],
  },
  {
    scene: '🚗 自驾游边境',
    sentences: [
      'May I see your passport and the car documents, please?',
      'I have a reservation under Huang.',
      'When is breakfast and where?',
    ],
  },
  {
    scene: '☕ 晨间 brunch',
    sentences: [
      "I'm grabbing brunch with a friend.",
      "I haven't decided yet.",
      "She's on the way and I'll head out soon.",
    ],
  },
  {
    scene: '🏙️ 城市探索',
    sentences: [
      'I went downtown by subway.',
      'It was crowded in front of the stalls.',
      'There was a crosswalk to get to the sidewalk.',
      'I ordered a bagel for takeout.',
    ],
  },
]
