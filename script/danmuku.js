const zlib = require("zlib");
const WebSocket = require("ws");

// #region 声明encode和decode方法
const textEncoder = new TextEncoder("utf-8");
const textDecoder = new TextDecoder("utf-8");

const readInt = function (buffer, start, len) {
    let result = 0;
    for (let i = len - 1; i >= 0; i--) {
        result += Math.pow(256, len - i - 1) * buffer[start + i];
    }
    return result;
};

const writeInt = function (buffer, start, len, value) {
    let i = 0;
    while (i < len) {
        buffer[start + i] = value / Math.pow(256, len - i - 1);
        i++;
    }
};

const encode = function (str, op) {
    let data = textEncoder.encode(str);
    let packetLen = 16 + data.byteLength;
    let header = [0, 0, 0, 0, 0, 16, 0, 1, 0, 0, 0, op, 0, 0, 0, 1];
    writeInt(header, 0, 4, packetLen);
    return new Uint8Array(header.concat(...data)).buffer;
};
const decoder = function (blob) {
    let buffer = new Uint8Array(blob);
    let result = {};
    result.packetLen = readInt(buffer, 0, 4);
    result.headerLen = readInt(buffer, 4, 2);
    result.ver = readInt(buffer, 6, 2);
    result.op = readInt(buffer, 8, 4);
    result.seq = readInt(buffer, 12, 4);
    if (result.op === 5) {
        result.body = [];
        let offset = 0;
        while (offset < buffer.length) {
            let packetLen = readInt(buffer, offset + 0, 4);
            let headerLen = 16; // readInt(buffer,offset + 4,4)
            if (result.ver == 2) {
                let data = buffer.slice(offset + headerLen, offset + packetLen);
                let newBuffer = zlib.inflateSync(new Uint8Array(data));
                const obj = decoder(newBuffer);
                const body = obj.body;
                result.body = result.body.concat(body);
            } else {
                let data = buffer.slice(offset + headerLen, offset + packetLen);
                let body = textDecoder.decode(data);
                if (body) {
                    result.body.push(JSON.parse(body));
                }
            }
            // let body = textDecoder.decode(pako.inflate(data));
            // if (body) {
            //   result.body.push(JSON.parse(body.slice(body.indexOf("{"))));
            // }
            offset += packetLen;
        }
    } else if (result.op === 3) {
        result.body = {
            count: readInt(buffer, 16, 4),
        };
    }
    return result;
};

const decode = function (blob) {
    return new Promise(function (resolve, reject) {
        try {
            const result = decoder(blob);
            resolve(result);
        } catch (e) {
            reject(e);
        }
    });
};
// #endregion

// #region 连接 WebSocket并发送进入房间请求
const ws = new WebSocket("wss://broadcastlv.chat.bilibili.com:2245/sub");
ws.onopen = function () {
    ws.send(
        encode(
            JSON.stringify({
                roomid: 22642754,
            }),
            7
        )
    );
};
// #endregion

// #region 每隔 30 秒发送一次心跳
setInterval(function () {
    ws.send(encode("", 2));
}, 30000);
// #endregion

// #region 接收
ws.onmessage = async function (msgEvent) {
    const packet = await decode(msgEvent.data);
    switch (packet.op) {
        case 8:
            console.log("加入房间");
            break;
        case 3:
            const count = packet.body.count;
            console.log(`人气：${count}`);
            break;
        case 5:
            packet.body.forEach((body) => {
                switch (body.cmd) {
                    // 弹幕
                    case "DANMU_MSG":
                        console.log(`${body.info[2][1]}: ${body.info[1]}`);
                        break;
                    // 醒目留言
                    case 'SUPER_CHAT_MESSAGE':
                        console.log(`[醒目留言] ${body.data.user_info.uname}: ${body.data.message}`)
                        break;
                    // 礼物
                    case "SEND_GIFT":
                        console.log(
                            `${body.data.uname} ${body.data.action} ${body.data.num} 个 ${body.data.giftName}`
                        );
                        break;
                    // 礼物连击的最终结果
                    case "COMBO_SEND":
                        console.log(
                            `${body.data.uname} ${body.data.action} ${body.data.combo_num} 个 ${body.data.gift_name}`
                        );
                        break;
                    case "WELCOME":
                        console.log(`欢迎 ${body.data.uname}`);
                        break;
                    // 入场
                    case "INTERACT_WORD":
                        console.log(`${body.data.uname} 进入直播间`);
                        break;
                    // 带特效的入场
                    case 'ENTRY_EFFECT':
                        console.log(`${body.data.copy_writing}`);
                        break;
                    // 频道广播
                    case "NOTICE_MSG":
                        console.log(`${body.name} ${body.msg_self}`);
                        break;
                    // 高能榜
                    case "ONLINE_RANK_COUNT":
                        console.log(`上榜人数: ${body.data.count}`);
                        break;
                    // 高能榜
                    case "ONLINE_RANK_V2":
                        console.log(`高能榜前7 ${body.data.list.map(res => `${res.uname}(${res.score})`).join(' ')}`);
                        break;
                    // 高能榜 前三 排名变动
                    case "ONLINE_RANK_TOP3":
                        console.log(`${body.data.list[0].msg} 第${body.data.list[0].rank}名`);
                        break;
                    // 房间信息更新
                    case "ROOM_REAL_TIME_MESSAGE_UPDATE":
                        console.log(`当前粉丝数: ${body.data.fans}  当前粉丝团人数: ${body.data.fans_club}`);
                        break;
                    // 热门榜
                    case "HOT_RANK_CHANGED":
                        console.log(`${body.data.area_name} ${body.data.rank}`);
                        break;
                    // 热门top50
                    case "HOT_RANK_CHANGED_V2":
                        console.log(`${body.data.area_name} ${body.data.rank}`);
                        break;
                    // 此处省略很多其他通知类型
                    default:
                        console.log(body);
                }
            });
            break;
        default:
            console.log(packet);
    }
};
// #endregion