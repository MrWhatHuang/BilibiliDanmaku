<template>
  <div class="danmu-show-container">
    <div class="count-container">
      <div>人气值：{{ poplular }}</div>
    </div>

    <div class="content">
      <div class="danmu-list">
        <div class="content-title">弹幕({{ danmuList.length }})</div>
        <div class="danmu-content" ref="danmu">
          <div v-for="(item, index) in danmuList" :key="index">
            <span class="user-name">{{ item.uname }}</span>
            ：
            <span>{{ item.text }}</span>
          </div>
        </div>
      </div>
      <div class="user-list">
        <div class="content-title">用户({{ userList.length }})</div>
        <div class="user-content" ref="user">
          <div v-for="(item, index) in userList" :key="index">
            <span class="user-name">{{ item.uname }}</span> 进入直播间
          </div>
        </div>
      </div>
    </div>

    <DJRoom class="dj-room" />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import DJRoom from '../components/DJRoom/index.vue';

const ws = new WebSocket('ws://localhost:8181');

const danmu = ref();
const user = ref();

const poplular = ref(0);
const danmuList: any = ref([]);
const userList: any = ref([]);

ws.onmessage = ({ data }) => {
  const res = JSON.parse(data);
  switch (res.type) {
    case 'ROOM_POPULAR':
      poplular.value = res.data;
      break;
    case 'DANMU_MSG':
      if (danmuList.value.length >= 100) {
        danmuList.value.splice(0, 1);
      }
      danmuList.value.push(res.data);
      if (danmu.value) {
        danmu.value.scrollTop = danmu.value.scrollHeight;
      }
      break;
    case 'WELCOME':
    case 'INTERACT_WORD':
      userList.value.push(res.data);
      if (user.value) {
        user.value.scrollTop = user.value.scrollHeight;
      }
      break;

    default:
      break;
  }
};
ws.onopen = () => {

};
ws.onerror = () => {

};
ws.onclose = () => {

};
</script>

<style scoped lang="scss">
.danmu-show-container {
  position: relative;
  height: 100%;
  width: 100%;

  .count-container {
    position: absolute;
    top: 10px;
    left: 10px;
  }

  .content-title {
    font-size: 20px;
    font-weight: bold;
  }
  .user-name {
    color: #385299;
    height: 30px;
    line-height: 30px;
  }

  .danmu-list {
    padding: 5px;
    position: absolute;
    top: 50px;
    left: 10px;
    width: 250px;
    height: 600px;
    .danmu-content {
      overflow-y: auto;
      height: calc(100% - 40px);
    }
  }

  .user-list {
    padding: 5px;
    position: absolute;
    top: 50px;
    right: 10px;
    width: 250px;
    height: 600px;
    .user-content {
      overflow-y: auto;
      height: calc(100% - 40px);
    }
  }
  .dj-room {
    height: 100%;
    width: 100%;
  }
}
</style>
