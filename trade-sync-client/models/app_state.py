from models.base_state import BaseState
from models.master_state import MasterState
from models.slave_state import SlaveState


class AppState(BaseState, MasterState, SlaveState):
    def __init__(self):
        BaseState.__init__(self)
        MasterState.__init__(self)
        SlaveState.__init__(self)