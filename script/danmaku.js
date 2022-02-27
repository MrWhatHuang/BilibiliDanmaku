const zlib = require("zlib");
const WebSocket = require("ws");

const server = new WebSocket.WebSocketServer({
    host: 'localhost',
    port: 8181,
});

server.on('connection', (ws) => {
});

function sentMessage (data) {
    server.clients.forEach(function each (client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

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
                roomid: 1017,
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
            // 进入房间
            sentMessage({
                type: 'ENTRY_ROOM',
                data: '进入房间'
            });
            break;
        case 3:
            // 人气值
            sentMessage({
                type: 'ROOM_POPULAR',
                data: packet.body.count
            });
            break;
        case 5:
            packet.body.forEach((body) => {
                switch (body.cmd) {
                    // 弹幕
                    case "DANMU_MSG":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                uname: body.info[2][1],
                                text: body.info[1]
                            }
                        });
                        break;
                    // 醒目留言
                    case 'SUPER_CHAT_MESSAGE':
                        sentMessage({
                            type: body.cmd,
                            data: {
                                uname: body.data.user_info.uname,
                                text: body.data.message
                            }
                        });
                        break;
                    // 礼物
                    case "SEND_GIFT":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                uname: body.data.uname,
                                action: body.data.action,
                                num: body.data.num,
                                giftName: body.data.giftName
                            }
                        });
                        break;
                    // 礼物连击的最终结果
                    case "COMBO_SEND":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                uname: body.data.uname,
                                action: body.data.action,
                                num: body.data.combo_num,
                                giftName: body.data.gift_name
                            }
                        });
                        break;
                    // 欢迎
                    case "WELCOME":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                uname: body.data.uname,
                            }
                        });
                        break;
                    // 进入直播间
                    case "INTERACT_WORD":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                uname: body.data.uname,
                            }
                        });
                        break;
                    // 带特效的入场
                    case 'ENTRY_EFFECT':
                        sentMessage({
                            type: body.cmd,
                            data: {
                                text: body.data.copy_writing,
                            }
                        });
                        break;
                    // 频道广播
                    case "NOTICE_MSG":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                name: body.name,
                                text: body.msg_self
                            }
                        });
                        break;
                    // 高能榜 上榜人数
                    case "ONLINE_RANK_COUNT":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                count: body.data.count
                            }
                        });
                        break;
                    // 高能榜前7
                    case "ONLINE_RANK_V2":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                list: body.data.list.map(res => {
                                    return {
                                        uname: res.uname,
                                        score: res.score
                                    }
                                })
                            }
                        });
                        break;
                    // 高能榜 前三 排名变动
                    case "ONLINE_RANK_TOP3":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                list: body.data.list.map(res => {
                                    return {
                                        uname: res.msg,
                                        rank: res.rank
                                    }
                                })
                            }
                        });
                        break;
                    // 房间信息更新 粉丝数 粉丝团人数
                    case "ROOM_REAL_TIME_MESSAGE_UPDATE":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                fans: body.data.fans,
                                clubFans: body.data.fans_club
                            }
                        });
                        break;
                    // 热门榜
                    case "HOT_RANK_CHANGED":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                name: body.data.area_name,
                                rank: body.data.rank
                            }
                        });
                        break;
                    // 热门top50
                    case "HOT_RANK_CHANGED_V2":
                        sentMessage({
                            type: body.cmd,
                            data: {
                                name: body.data.area_name,
                                rank: body.data.rank
                            }
                        });
                        break;
                    // 此处省略很多其他通知类型
                    default:
                    // console.log(body);
                }
            });
            break;
        default:
            console.log(packet);
    }
};
// #endregion
