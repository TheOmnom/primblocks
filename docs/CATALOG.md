# Brick catalog

Generated from `src/lib/lsl/events.ts` and `src/lib/lsl/functions.ts`. Do not hand-edit — `npm run catalog`.

Events: **39**. ll* bricks: **222**.

Hover a brick in the editor for the wiki URL. Event signatures below are what the yellow hats emit.

## Events

Every yellow hat has a **state** field (default `default`). Body snaps underneath.

| Event | Signature |
|---|---|
| `state_entry` | `state_entry()` |
| `state_exit` | `state_exit()` |
| `touch_start` | `touch_start(integer num_detected)` |
| `touch` | `touch(integer num_detected)` |
| `touch_end` | `touch_end(integer num_detected)` |
| `collision_start` | `collision_start(integer num_detected)` |
| `collision` | `collision(integer num_detected)` |
| `collision_end` | `collision_end(integer num_detected)` |
| `land_collision_start` | `land_collision_start(vector pos)` |
| `land_collision` | `land_collision(vector pos)` |
| `land_collision_end` | `land_collision_end(vector pos)` |
| `timer` | `timer()` |
| `listen` | `listen(integer channel, string name, key id, string message)` |
| `sensor` | `sensor(integer num_detected)` |
| `no_sensor` | `no_sensor()` |
| `control` | `control(key id, integer level, integer edge)` |
| `dataserver` | `dataserver(key queryid, string data)` |
| `http_response` | `http_response(key request_id, integer status, list metadata, string body)` |
| `http_request` | `http_request(key request_id, string method, string body)` |
| `link_message` | `link_message(integer sender_num, integer num, string str, key id)` |
| `changed` | `changed(integer change)` |
| `attach` | `attach(key id)` |
| `on_rez` | `on_rez(integer start_param)` |
| `object_rez` | `object_rez(key id)` |
| `money` | `money(key id, integer amount)` |
| `run_time_permissions` | `run_time_permissions(integer perm)` |
| `experience_permissions` | `experience_permissions(key agent_id)` |
| `experience_permissions_denied` | `experience_permissions_denied(key agent_id, integer reason)` |
| `at_target` | `at_target(integer tnum, vector targetpos, vector ourpos)` |
| `not_at_target` | `not_at_target()` |
| `at_rot_target` | `at_rot_target(integer tnum, rotation targetrot, rotation ourrot)` |
| `not_at_rot_target` | `not_at_rot_target()` |
| `moving_start` | `moving_start()` |
| `moving_end` | `moving_end()` |
| `email` | `email(string time, string address, string subject, string message, integer num_left)` |
| `remote_data` | `remote_data(integer event_type, key channel, key message_id, string sender, integer idata, string sdata)` |
| `transaction_result` | `transaction_result(key id, integer success, string data)` |
| `path_update` | `path_update(integer type, list reserved)` |
| `linkset_data` | `linkset_data(integer action, string name, string value)` |

Wiki: `https://wiki.secondlife.com/wiki/<EventName>` (first letter capitalised).

## Functions

### Chat

| Call | Brick | Delay |
|---|---|---|
| `llSay` (command) | say … on channel … | — |
| `llWhisper` (command) | whisper … on channel … | — |
| `llShout` (command) | shout … on channel … | — |
| `llRegionSay` (command) | region-say … on channel … | — |
| `llRegionSayTo` (command) | region-say … to … on channel … | — |
| `llOwnerSay` (command) | owner-say … | — |
| `llInstantMessage` (command) | IM … to … | 2s |
| `llListen` (reporter) | listen on channel … from name … key … message … | — |
| `llListenRemove` (command) | remove listen … | — |
| `llListenControl` (command) | set listen … active … | — |
| `llDialog` (command) | dialog to … message … buttons … channel … | 1s |
| `llTextBox` (command) | text box to … message … channel … | 1s |
| `llLoadURL` (command) | offer URL … with label … to … | 10s |
| `llMessageLinked` (command) | link-message to … num … string … key … | — |

### Looks

| Call | Brick | Delay |
|---|---|---|
| `llSetText` (command) | set hover text … color … alpha … | — |
| `llSetColor` (command) | set color … on face … | — |
| `llSetAlpha` (command) | set alpha … on face … | — |
| `llSetTexture` (command) | set texture … on face … | 0.2s |
| `llScaleTexture` (command) | scale texture u … v … on face … | 0.2s |
| `llOffsetTexture` (command) | offset texture u … v … on face … | 0.2s |
| `llRotateTexture` (command) | rotate texture … rad on face … | 0.2s |
| `llSetLinkColor` (command) | set link … color … face … | — |
| `llSetLinkAlpha` (command) | set link … alpha … face … | — |
| `llSetLinkTexture` (command) | set link … texture … face … | 0.2s |
| `llSetScale` (command) | set scale … | — |
| `llGetScale` (reporter) | prim scale | — |
| `llSetObjectName` (command) | set object name … | — |
| `llGetObjectName` (reporter) | object name | — |
| `llSetObjectDesc` (command) | set description … | — |
| `llGetObjectDesc` (reporter) | object description | — |
| `llSetClickAction` (command) | set click action … | — |
| `llSetPayPrice` (command) | set pay price … quick buttons … | — |
| `llParticleSystem` (command) | particle system … | — |

### Motion

| Call | Brick | Delay |
|---|---|---|
| `llSetPos` (command) | set position … | 0.2s |
| `llGetPos` (reporter) | position | — |
| `llGetLocalPos` (reporter) | local position | — |
| `llSetRot` (command) | set rotation … | 0.2s |
| `llGetRot` (reporter) | rotation | — |
| `llSetLocalRot` (command) | set local rotation … | 0.2s |
| `llGetLocalRot` (reporter) | local rotation | — |
| `llSetRegionPos` (reporter) | set region position … | — |
| `llTargetOmega` (command) | spin axis … rate … gain … | — |
| `llMoveToTarget` (command) | move to … with tau … | — |
| `llStopMoveToTarget` (command) | stop move to target | — |
| `llLookAt` (command) | look at … strength … damping … | — |
| `llStopLookAt` (command) | stop look at | — |
| `llSetStatus` (command) | set status … to … | — |
| `llGetStatus` (reporter) | status … | — |
| `llSetForce` (command) | set force … local … | — |
| `llApplyImpulse` (command) | apply impulse … local … | — |
| `llSetVelocity` (command) | set velocity … local … | — |
| `llGetVel` (reporter) | velocity | — |
| `llGetOmega` (reporter) | angular velocity | — |
| `llSitTarget` (command) | sit target offset … rot … | — |
| `llAvatarOnSitTarget` (reporter) | avatar on sit target | — |
| `llUnSit` (command) | unsit … | — |
| `llSetHoverHeight` (command) | hover height … water … tau … | — |
| `llStopHover` (command) | stop hover | — |
| `llSetBuoyancy` (command) | set buoyancy … | — |
| `llGetMass` (reporter) | mass | — |
| `llVolumeDetect` (command) | volume detect … | — |

### Sound

| Call | Brick | Delay |
|---|---|---|
| `llPlaySound` (command) | play sound … volume … | — |
| `llLoopSound` (command) | loop sound … volume … | — |
| `llStopSound` (command) | stop sound | — |
| `llPreloadSound` (command) | preload sound … | 1s |
| `llTriggerSound` (command) | trigger sound … volume … | — |
| `llSetSoundRadius` (command) | sound radius … m | — |
| `llAdjustSoundVolume` (command) | adjust volume … | 0.1s |

### Sensing

| Call | Brick | Delay |
|---|---|---|
| `llGetOwner` (reporter) | owner key | — |
| `llGetKey` (reporter) | this key | — |
| `llGetCreator` (reporter) | creator key | — |
| `llGetOwnerKey` (reporter) | owner of … | — |
| `llKey2Name` (reporter) | name of … | — |
| `llDetectedKey` (reporter) | detected key … | — |
| `llDetectedName` (reporter) | detected name … | — |
| `llDetectedPos` (reporter) | detected position … | — |
| `llDetectedRot` (reporter) | detected rotation … | — |
| `llDetectedVel` (reporter) | detected velocity … | — |
| `llDetectedType` (reporter) | detected type … | — |
| `llDetectedLinkNumber` (reporter) | detected link number … | — |
| `llDetectedGrab` (reporter) | detected grab … | — |
| `llDetectedTouchST` (reporter) | touch ST … | — |
| `llDetectedTouchUV` (reporter) | touch UV … | — |
| `llDetectedTouchPos` (reporter) | touch position … | — |
| `llDetectedTouchFace` (reporter) | touch face … | — |
| `llDetectedTouchNormal` (reporter) | touch normal … | — |
| `llDetectedTouchBinormal` (reporter) | touch binormal … | — |
| `llSensor` (command) | sensor name … key … type … range … arc … | — |
| `llSensorRepeat` (command) | repeat sensor name … key … type … range … arc … rate … | — |
| `llSensorRemove` (command) | remove sensor | — |
| `llSameGroup` (reporter) | same group as … | — |
| `llOverMyLand` (reporter) | over my land … | — |
| `llGetAgentInfo` (reporter) | agent info … | — |
| `llGetAgentSize` (reporter) | agent size … | — |
| `llRequestAgentData` (reporter) | request agent data … field … | 0.1s |
| `llGetObjectDetails` (reporter) | object details of … params … | — |
| `llGetRegionName` (reporter) | region name | — |
| `llGetRegionTimeDilation` (reporter) | time dilation | — |
| `llGetRegionFPS` (reporter) | region FPS | — |
| `llGround` (reporter) | ground height at … | — |
| `llWater` (reporter) | water height at … | — |
| `llGetUnixTime` (reporter) | unix time | — |
| `llGetTimestamp` (reporter) | timestamp | — |
| `llGetDate` (reporter) | date | — |
| `llGetWallclock` (reporter) | SL wallclock | — |
| `llGetGMTclock` (reporter) | GMT clock | — |
| `llGetTime` (reporter) | script time | — |
| `llResetTime` (command) | reset script time | — |
| `llGetAndResetTime` (reporter) | get and reset script time | — |
| `llGetFreeMemory` (reporter) | free memory | — |
| `llGetUsedMemory` (reporter) | used memory | — |
| `llGetScriptName` (reporter) | script name | — |
| `llGetLinkNumber` (reporter) | this link number | — |
| `llGetNumberOfPrims` (reporter) | number of prims | — |
| `llGetLinkKey` (reporter) | key of link … | — |
| `llGetLinkName` (reporter) | name of link … | — |
| `llGetNumberOfSides` (reporter) | number of sides | — |
| `llGetStartParameter` (reporter) | start parameter | — |
| `llGetInventoryNumber` (reporter) | inventory count of type … | — |
| `llGetInventoryName` (reporter) | inventory name type … index … | — |
| `llGetInventoryKey` (reporter) | inventory key … | — |
| `llGetInventoryType` (reporter) | inventory type of … | — |

### World

| Call | Brick | Delay |
|---|---|---|
| `llSleep` (command) | pause script … seconds | — |
| `llSetTimerEvent` (command) | set timer every … seconds | — |
| `llResetScript` (command) | reset this script | — |
| `llDie` (command) | delete this object | — |
| `llMinEventDelay` (command) | min event delay … | — |
| `llGiveInventory` (command) | give inventory … to … | 2s |
| `llRemoveInventory` (command) | remove inventory … | — |
| `llRezObject` (command) | rez … at … vel … rot … param … | 0.1s |
| `llRezAtRoot` (command) | rez at root … at … vel … rot … param … | 0.1s |
| `llRequestPermissions` (command) | request permissions from … bits … | — |
| `llGetPermissions` (reporter) | granted permissions | — |
| `llGetPermissionsKey` (reporter) | permissions avatar | — |
| `llStartAnimation` (command) | start animation … | — |
| `llStopAnimation` (command) | stop animation … | — |
| `llTakeControls` (command) | take controls … accept … pass … | — |
| `llReleaseControls` (command) | release controls | — |
| `llDetachFromAvatar` (command) | detach from avatar | — |
| `llAttachToAvatar` (command) | attach to point … | — |
| `llGetAttached` (reporter) | attach point | — |
| `llHTTPRequest` (reporter) | HTTP request url … params … body … | — |
| `llHTTPResponse` (command) | HTTP response id … status … body … | — |
| `llRequestURL` (reporter) | request HTTP-in URL | — |
| `llRequestSecureURL` (reporter) | request HTTPS-in URL | — |
| `llReleaseURL` (command) | release URL … | — |
| `llGetNotecardLine` (reporter) | notecard … line … | 0.1s |
| `llGetNumberOfNotecardLines` (reporter) | notecard line count … | 0.1s |
| `llAllowInventoryDrop` (command) | allow inventory drop … | — |
| `llPassTouches` (command) | pass touches … | — |
| `llPassCollisions` (command) | pass collisions … | — |
| `llGiveMoney` (reporter) | give L$ … to … | — |
| `llTeleportAgentHome` (command) | teleport … home | 5s |
| `llEjectFromLand` (command) | eject … from parcel | — |
| `llBreakAllLinks` (command) | break all links | — |
| `llCreateLink` (command) | create link to … parent … | 1s |
| `llSetLinkPrimitiveParamsFast` (command) | set link params link … rules … | — |
| `llGetPrimitiveParams` (reporter) | get primitive params … | 0.2s |
| `llLinksetDataWrite` (reporter) | linkset data write … = … | — |
| `llLinksetDataRead` (reporter) | linkset data read … | — |
| `llLinksetDataDelete` (reporter) | linkset data delete … | — |
| `llLinksetDataCountKeys` (reporter) | linkset data key count | — |

### Operators

| Call | Brick | Delay |
|---|---|---|
| `llAbs` (reporter) | abs … | — |
| `llFabs` (reporter) | fabs … | — |
| `llFloor` (reporter) | floor … | — |
| `llCeil` (reporter) | ceil … | — |
| `llRound` (reporter) | round … | — |
| `llSqrt` (reporter) | sqrt … | — |
| `llPow` (reporter) | … ^ … | — |
| `llSin` (reporter) | sin … | — |
| `llCos` (reporter) | cos … | — |
| `llTan` (reporter) | tan … | — |
| `llAsin` (reporter) | asin … | — |
| `llAcos` (reporter) | acos … | — |
| `llAtan2` (reporter) | atan2 y … x … | — |
| `llLog` (reporter) | ln … | — |
| `llLog10` (reporter) | log10 … | — |
| `llFrand` (reporter) | random 0 to … | — |
| `llVecMag` (reporter) | magnitude of … | — |
| `llVecNorm` (reporter) | normalize … | — |
| `llVecDist` (reporter) | distance … to … | — |
| `llEuler2Rot` (reporter) | euler … to rotation | — |
| `llRot2Euler` (reporter) | rotation … to euler | — |
| `llRot2Fwd` (reporter) | forward of … | — |
| `llRot2Left` (reporter) | left of … | — |
| `llRot2Up` (reporter) | up of … | — |
| `llAxes2Rot` (reporter) | axes fwd … left … up … to rotation | — |
| `llRotBetween` (reporter) | rotation from … to … | — |
| `llAngleBetween` (reporter) | angle between … and … | — |
| `llStringLength` (reporter) | length of … | — |
| `llToUpper` (reporter) | upper … | — |
| `llToLower` (reporter) | lower … | — |
| `llGetSubString` (reporter) | substring of … from … to … | — |
| `llDeleteSubString` (reporter) | delete substring of … from … to … | — |
| `llInsertString` (reporter) | insert … into … at … | — |
| `llSubStringIndex` (reporter) | index of … in … | — |
| `llStringTrim` (reporter) | trim … mode … | — |
| `llMD5String` (reporter) | MD5 of … nonce … | — |
| `llSHA1String` (reporter) | SHA1 of … | — |
| `llEscapeURL` (reporter) | escape URL … | — |
| `llUnescapeURL` (reporter) | unescape URL … | — |
| `llChar` (reporter) | char … | — |
| `llOrd` (reporter) | ord … index … | — |

### Lists

| Call | Brick | Delay |
|---|---|---|
| `llGetListLength` (reporter) | length of list … | — |
| `llList2String` (reporter) | item … of … as string | — |
| `llList2Integer` (reporter) | item … of … as integer | — |
| `llList2Float` (reporter) | item … of … as float | — |
| `llList2Key` (reporter) | item … of … as key | — |
| `llList2Vector` (reporter) | item … of … as vector | — |
| `llList2Rot` (reporter) | item … of … as rotation | — |
| `llList2List` (reporter) | sublist of … from … to … | — |
| `llDeleteSubList` (reporter) | delete items … to … of … | — |
| `llListInsertList` (reporter) | insert … into … at … | — |
| `llListReplaceList` (reporter) | replace … to … of … with … | — |
| `llListFindList` (reporter) | find … in … | — |
| `llListSort` (reporter) | sort … stride … ascending … | — |
| `llListRandomize` (reporter) | randomize … stride … | — |
| `llDumpList2String` (reporter) | join … with … | — |
| `llParseString2List` (reporter) | split … on … keep … | — |
| `llCSV2List` (reporter) | CSV … to list | — |
| `llList2CSV` (reporter) | list … to CSV | — |
| `llListStatistics` (reporter) | stats … of … | — |

## Brick labels vs call order

A few bricks are phrased in English ("say *message* on channel *n*") and reorder args to the official ll* signature via `order` on the `FnDef`. If a new brick's generated call looks backwards, check that field before touching the generator.

Forced delays come from `src/lib/lsl/limits.ts` (LSL Delay table). A dash means no forced delay — the call can still throttle (HTTP 0.5s spacing, chat caps, etc).

