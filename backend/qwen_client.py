"""
Qwen-Omni-Realtime API 客戶端封裝
基於官方文檔: https://help.aliyun.com/zh/model-studio/realtime
"""
import asyncio
import base64
import logging
import os
from typing import Callable, Optional
import dashscope
from dashscope.audio.qwen_omni import (
    OmniRealtimeConversation,
    OmniRealtimeCallback,
    MultiModality,
    AudioFormat
)

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
        # 設置 DashScope API Key
        dashscope.api_key = api_key

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

            # 創建對話實例（使用新加坡地域）
            self.conversation = OmniRealtimeConversation(
                model=self.model,
                callback=callback,
                url="wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime"
            )

            # 連接到 API
            await asyncio.to_thread(self.conversation.connect)

            # 配置會話：啟用 server-side VAD
            await asyncio.to_thread(
                self.conversation.update_session,
                output_modalities=[MultiModality.AUDIO, MultiModality.TEXT],
                voice='Cherry',
                input_audio_format=AudioFormat.PCM_16000HZ_MONO_16BIT,
                output_audio_format=AudioFormat.PCM_24000HZ_MONO_16BIT,
                enable_input_audio_transcription=True,
                enable_turn_detection=True,
                turn_detection_type='server_vad'
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
            # 轉換為 base64
            audio_b64 = base64.b64encode(audio_data).decode('ascii')
            await asyncio.to_thread(
                self.conversation.append_audio,
                audio_b64
            )
        except Exception as e:
            logger.error(f"發送音頻失敗: {e}")

    async def send_image(self, image_data: str):
        """
        發送視頻幀數據

        Args:
            image_data: Base64 編碼的圖片數據（JPEG格式）
        """
        if not self.is_connected or not self.conversation:
            logger.warning("未連接到 API，無法發送視頻幀")
            return

        try:
            await asyncio.to_thread(
                self.conversation.append_video,
                image_data
            )
            logger.debug("已發送視頻幀")
        except Exception as e:
            logger.error(f"發送視頻幀失敗: {e}")

    async def disconnect(self):
        """斷開連接"""
        if self.conversation:
            try:
                await asyncio.to_thread(self.conversation.close)
                self.is_connected = False
                logger.info("已斷開 Qwen API 連接")
            except Exception as e:
                logger.error(f"斷開連接失敗: {e}")


class QwenCallbackHandler(OmniRealtimeCallback):
    """Qwen API 回調處理器"""

    def __init__(self, on_audio_data: Callable, on_text_data: Callable):
        super().__init__()
        self.on_audio_data = on_audio_data
        self.on_text_data = on_text_data

    def on_open(self) -> None:
        """連接打開"""
        logger.info("WebSocket 連接已建立")

    def on_event(self, response: dict) -> None:
        """處理事件"""
        try:
            event_type = response.get('type')
            logger.info(f"收到事件: {event_type}")

            if event_type == 'response.audio.delta':
                # 接收音頻流片段（直接解碼並調用回調，參考官方示例）
                audio_b64 = response.get('delta', '')
                if audio_b64 and self.on_audio_data:
                    audio_bytes = base64.b64decode(audio_b64)
                    logger.info(f"收到音頻數據: {len(audio_bytes)} bytes")
                    # 直接調用同步回調函數
                    self.on_audio_data(audio_bytes)

            elif event_type == 'response.text.delta':
                # 接收文本流片段
                text_delta = response.get('delta', '')
                if text_delta and self.on_text_data:
                    logger.info(f"收到文本: {text_delta}")
                    # 直接調用同步回調函數
                    self.on_text_data(text_delta)

            elif event_type == 'conversation.item.input_audio_transcription.completed':
                # 用戶語音轉錄完成
                transcript = response.get('transcript', '')
                logger.info(f"用戶說: {transcript}")

            elif event_type == 'response.done':
                # 響應完成
                logger.info("API 響應完成")

        except Exception as e:
            logger.error(f"處理事件失敗: {e}")

    def on_close(self, code: int, msg: str) -> None:
        """連接關閉"""
        logger.info(f"WebSocket 連接已關閉 (code={code}, msg={msg})")

    def on_error(self, error: str) -> None:
        """錯誤處理"""
        logger.error(f"API 錯誤: {error}")
