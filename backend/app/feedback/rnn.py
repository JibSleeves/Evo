from typing import Dict, Tuple
import torch
import torch.nn as nn


class TinyFeedbackRNN(nn.Module):
    def __init__(self, input_dim: int = 384, hidden_dim: int = 256, num_layers: int = 1) -> None:
        super().__init__()
        self.lstm = nn.LSTM(input_size=input_dim, hidden_size=hidden_dim, num_layers=num_layers, batch_first=True)

    def forward(self, x: torch.Tensor, state: Tuple[torch.Tensor, torch.Tensor] | None = None):
        out, new_state = self.lstm(x, state)
        return out, new_state


class FeedbackState:
    def __init__(self, device: str = "cpu") -> None:
        self.device = device
        self.model = TinyFeedbackRNN().to(device)
        self.session_to_state: Dict[str, Tuple[torch.Tensor, torch.Tensor]] = {}

    def get_state(self, session_id: str) -> Tuple[torch.Tensor, torch.Tensor] | None:
        return self.session_to_state.get(session_id)

    def update(self, session_id: str, embedding: torch.Tensor) -> None:
        # embedding: (dim,) -> (1,1,dim)
        x = embedding.view(1, 1, -1).to(self.device)
        state = self.session_to_state.get(session_id)
        with torch.no_grad():
            _, new_state = self.model(x, state)
        self.session_to_state[session_id] = new_state