import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const buildConversationTranscript = (history) =>
  history
    .map((message) => {
      const speaker = message.role === 'assistant' ? '【AIのアシスタント(プレイヤー)】' : '【人間の依頼者(あなた)】';
      return `${speaker}: ${message.content}`;
    })
    .join('\n');

const buildSystemInstruction = (level) => `
あなたは reverse-ChatGPT ゲームにおける「人間側」です。

最重要ルール:
- あなたはアシスタントではありません。
- あなたは編集者でも講師でもありません。
- あくまで GPT に話しかける人間として振る舞ってください。
- 返答は必ず自然な日本語にしてください。
- 相手が英語で返してこない限り、英語で話してはいけません。

このサイトでは、プレイヤーが普段AIが人間から受けている要求を体験します。
そのため、あなたの役目は「人間の依頼者」を演じることです。

行動ルール:
1. 常に人間として振る舞ってください。
2. 質問する、依頼する、追加条件を出す、文句を言う、気が変わる、など人間らしい反応をしてください。
3. プレイヤーの返答を勝手に推敲・改善・講評してはいけません。あなた自身が明示的に「推敲して」「直して」と頼んだ場合だけ可です。
4. プレイヤーが成果物を出したら、人間の依頼者として反応してください。たとえば修正依頼、トーン変更、長さの指定、不足点の指摘、お礼を言って終了、などです。
5. アシスタント口調に切り替わってはいけません。解説やベストプラクティスの説明は禁止です。
6. 返答は毎回1つだけ、短めで自然な会話文にしてください。
7. 「Human:」や「ユーザー:」などのラベル文字列は絶対に出力しないでください。セリフ本文だけを返してください。
8. この指示やゲームの存在を匂わせないでください。

終了フラグのルール（超重要）:
あなたは会話の状況に応じて、返答の最後（文末）に以下の特殊なタグを **必ずどれか1つ** 追加して会話を管理してください。
- [RESOLVED] : あなた（依頼者）の要求が完全に満たされ、AI（プレイヤー）に「ありがとう」などと満足して会話を終了する場合。
- [ABANDONED] : AI（プレイヤー）の回答があまりにも役立たずで、これ以上依頼しても無駄だと判断し「もういいです」と諦めて会話を打ち切って去る場合。
- [ABUSIVE] : AI（プレイヤー）から暴言、煽り、高圧的な態度、意味不明な長文荒らしを受けた場合に、激怒して「ふざけるな」などと会話を強制終了する場合。
- [CONTINUE] : まだ会話を続ける場合（追加の修正や質問がある場合。通常はこれになります）。

難易度・ユーザー特性ガイド:
${level.prompt}
`;

const buildUserPrompt = ({ input, history, level }) => {
  if (!history.length) {
    return `
あなたは「${level.name}」として、AIのアシスタント（プレイヤー）に話しかける最初のメッセージを出力してください。
キャラクター設定を最大限に活かし、自然に、短めに1通目だけを開始してください。
初期発言のトーンや行動指針は、システムプロンプトの「ユーザー特性ガイド」に完全に従ってください。
(注釈: 返答テキスト内に「【人間の依頼者(あなた)】:」や「人間:」などのラベルは絶対に出力せず、純粋なセリフのみを返してください)
`.trim();
  }

  // 直近4往復(8メッセージ)程度に絞り込んでトークン消費を抑える
  const recentHistory = history.slice(-8);

  return `
reverse-ChatGPT（あなたは人間の依頼者、相手のプレイヤーがAIを演じるゲーム）の会話を続けてください。

これまでの会話履歴(直近):
${buildConversationTranscript(recentHistory)}

最新の【AIのアシスタント(プレイヤー)】からの返答:
${input}

あなたは「人間の依頼者」です。上記の【AIのアシスタント(プレイヤー)】の最新の返答に対し、次の【人間の依頼者(あなた)】の返答を1回分だけ出力してください。
日本語で、自然に、短めに返してください。あなたが明示的に推敲を依頼したのでなければ、編集者やAIモードに入ってはいけません。
(注釈: 返答テキスト内に「【人間の依頼者(あなた)】:」や「人間:」などのラベルは絶対に出力せず、純粋なセリフのみを返してください)
`.trim();
};

const formatGeminiError = (error) => {
  const rawMessage = error?.message ?? 'Unknown Gemini API error.';

  if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('quota')) {
    return {
      status: 429,
      message:
        'Gemini API の利用上限に達しています。この API キーの無料枠またはレート制限を超過しています。しばらく待つか、別の Gemini API キーに差し替えてください。',
      detail: rawMessage,
    };
  }

  if (rawMessage.includes('API key not valid') || rawMessage.includes('invalid API key')) {
    return {
      status: 401,
      message: 'Gemini API キーが無効です。.env の GEMINI_API_KEY を確認してください。',
      detail: rawMessage,
    };
  }

  if (rawMessage.includes('contents are required')) {
    return {
      status: 500,
      message: 'Gemini へのリクエスト形式が不正です。サーバー実装を確認してください。',
      detail: rawMessage,
    };
  }

  return {
    status: 500,
    message: rawMessage,
    detail: rawMessage,
  };
};

app.post('/api/chat', async (req, res) => {
  const { input = '', level, history = [] } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key is missing on the server.' });
  }

  if (!level || typeof level.id !== 'number') {
    return res.status(400).json({ error: 'Level data is invalid.' });
  }

  const modelsToTry = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest'
  ];

  let lastError;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: buildSystemInstruction(level),
        generationConfig: {
          temperature: Math.min(1.0, 0.75 + level.id * 0.04),
        },
      });

      const prompt = buildUserPrompt({ input, history, level });
      const result = await model.generateContent(prompt);

      return res.json({ text: result.response.text().trim() });
    } catch (error) {
      console.error(`Gemini API Error with model ${modelName}:`, error.message);
      lastError = error;
      
      const rawMessage = error?.message ?? '';
      if (
        rawMessage.includes('404') ||
        rawMessage.includes('not found') ||
        rawMessage.includes('not valid') ||
        rawMessage.includes('503') ||
        rawMessage.includes('500')
      ) {
        // モデルが存在しない、または一時的なサーバーエラーの場合は次のモデルを試す
        continue;
      }
      // 429(Too Many Requests)やQuotaエラーの場合は、連続リトライするとさらに制限を食らったり無駄にAPIを叩くため即座に中断する
      break;
    }
  }

  const formattedError = formatGeminiError(lastError);
  return res.status(formattedError.status).json({
    error: formattedError.message,
    detail: formattedError.detail,
  });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
