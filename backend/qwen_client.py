"""
Qwen-Omni-Realtime API 客戶端封裝
"""
import asyncio
import json
import logging
from typing import Callable, Optional
from dashscope.audio.qwen_omni import OmniRealtimeConversation, RealtimeCallback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QwenRealtimeClient:
    """Qwen Realtime API 客戶端"""

    def __init__(self, api_key: str, model: str, on_audio_data: Callable, on_text_data: Callable):
        """
        初始化客戶端

        Args:
            api_key: DashScope API Key
            model: 模型名稱，例如 'qwen3-omni-flash-realtime'
            on_audio_data: 音頻數據回調函數
            on_text_data: 文本數據回調函數
        """
        self.api_key = api_key
        self.model = model
        self.on_audio_data = on_audio_data
        self.on_text_data = on_text_data
        self.conversation: Optional[OmniRealtimeConversation] = None
        self.is_connected = False

    async def connect(self):
        """連接到 Qwen API"""
        try:
            # 創建回調處理器
            callback = QwenCallbackHandler(
                on_audio_data=self.on_audio_data,
                on_text_data=self.on_text_data
            )

            # 創建對話實例
            self.conversation = OmniRealtimeConversation(
                model=self.model,
                api_key=self.api_key,
                callback=callback
            )

            # 連接到 API
            await asyncio.to_thread(self.conversation.connect)

            # 配置會話：啟用 server-side VAD
            await asyncio.to_thread(
                self.conversation.update_session,
                output_modalities=["text", "audio"],
                voice="Cherry",  # 可選：Cherry, Bella, Ethan 等
                turn_detection={
                    "type": "server_vad",
                    "threshold": 0.5,
                    "silence_duration_ms": 800
                },
                input_audio_format="pcm16",
                output_audio_format="pcm24"
            )

            self.is_connected = True
            logger.info("成功連接到 Qwen API，已啟用 server-side VAD")

        except Exception as e:
            logger.error(f"連接 Qwen API 失敗: {e}")
            raise

    async def send_audio(self, audio_data: bytes):
        """
        發送音頻數據

        Args:
            audio_data: PCM16 格式的音頻數據
        """
        if not self.is_connected or not self.conversation:
            logger.warning("未連接到 API，無法發送音頻")
            return

        try:
            await asyncio.to_thread(
                self.conversation.send_audio,
                audio_data
            )
        except Exception as e:
            logger.error(f"發送音頻失敗: {e}")

    async def send_image(self, image_data: str):
        """
        發送圖片數據

        Args:
            image_data: Base64 編碼的圖片數據
        """
        if not self.is_connected or not self.conversation:
            logger.warning("未連接到 API，無法發送圖片")
            return

        try:
            await asyncio.to_thread(
                self.conversation.send_image,
                image_data
            )
            logger.debug("已發送圖片幀")
        except Exception as e:
            logger.error(f"發送圖片失敗: {e}")

    async def disconnect(self):
        """斷開連接"""
        if self.conversation:
            try:
                await asyncio.to_thread(self.conversation.close)
                self.is_connected = False
                logger.info("已斷開 Qwen API 連接")
            except Exception as e:
                logger.error(f"斷開連接失敗: {e}")


class QwenCallbackHandler(RealtimeCallback):
    """Qwen API 回調處理器"""

    def __init__(self, on_audio_data: Callable, on_text_data: Callable):
        super().__init__()
        self.on_audio_data = on_audio_data
        self.on_text_data = on_text_data

    def on_audio_delta(self, audio_delta: bytes):
        """接收音頻流片段"""
        if self.on_audio_data:
            asyncio.create_task(self.on_audio_data(audio_delta))

    def on_audio_transcript_delta(self, text_delta: str):
        """接收文本轉錄流片段"""
        if self.on_text_data:
            asyncio.create_task(self.on_text_data(text_delta))

    def on_response_done(self):
        """響應完成"""
        logger.debug("API 響應完成")

    def on_error(self, error: str):
        """錯誤處理"""
        logger.error(f"API 錯誤: {error}")
