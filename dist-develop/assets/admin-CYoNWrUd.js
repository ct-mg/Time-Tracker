import{c as T,_ as xe}from"./index-CPY7Wky9.js";async function Pe(m="timetracker"){const n=(await T.churchtoolsClient.get("/custommodules")).find($=>$.shorty===m);if(!n)throw new Error(`Module for extension key "${m}" not found.`);return console.log(`Module ${m} found:`,n),n}async function xt(m,u,n){try{return await Pe(m)}catch{return await wt(m,u,n)}}async function wt(m,u,n){const $={name:u,shorty:m,description:n,sortKey:100},y=await T.churchtoolsClient.post("/custommodules",$);return console.log(`Created new module for ${m}:`,y),y}async function J(m){return m||(await Pe()).id}async function $t(m){return m=await J(m),(await T.churchtoolsClient.get(`/custommodules/${m}/customdatacategories`)).map(n=>{const{data:$,...y}=n;let A;return A=qe($,{}),{...y,...A}})}async function fe(m){return(await $t()).find(n=>n.shorty===m)}async function St(m,u){u=await J(u);const n=await T.churchtoolsClient.post(`/custommodules/${u}/customdatacategories`,m);return console.log(`Created category in module ${u}:`,n),n}async function V(m,u){return u=await J(u),(await T.churchtoolsClient.get(`/custommodules/${u}/customdatacategories/${m}/customdatavalues`)).map($=>{const{value:y,...A}=$;if(y==null)throw new Error(`Custom data value ${$.id} has null or undefined 'value' field.`);return{...qe(y,{}),...A}})}async function he(m,u){u=await J(u);const n=await T.churchtoolsClient.post(`/custommodules/${u}/customdatacategories/${m.dataCategoryId}/customdatavalues`,m);console.log(`Created data value in category ${m.dataCategoryId}:`,n)}async function we(m,u,n,$){$=await J($);const y=await T.churchtoolsClient.put(`/custommodules/${$}/customdatacategories/${m}/customdatavalues/${u}`,n);console.log(`Updated data value ${u} in category ${m}:`,y)}async function $e(m,u,n){n=await J(n),await T.churchtoolsClient.deleteApi(`/custommodules/${n}/customdatacategories/${m}/customdatavalues/${u}`),console.log(`Deleted data value ${u} from category ${m}`)}function qe(m,u){if(!m)return u;try{return JSON.parse(m)}catch(n){return console.warn("Failed to parse JSON:",n),u}}let oe=null;async function Me(m){try{m==="de"?oe=(await xe(async()=>{const{default:u}=await import("./de-AMYjEJpB.js");return{default:u}},[])).default:oe=(await xe(async()=>{const{default:u}=await import("./en-CcieGhEJ.js");return{default:u}},[])).default}catch(u){console.error("[i18n] Failed to load translations:",u),oe=(await xe(async()=>{const{default:n}=await import("./en-CcieGhEJ.js");return{default:n}},[])).default}}function Se(){return navigator.language.toLowerCase().startsWith("de")?"de":"en"}function t(m,u){if(!oe)return console.warn("[i18n] Translations not loaded, returning key:",m),m;let n=oe[m];return n===void 0?m:(u&&Object.entries(u).forEach(([$,y])=>{n=n.replace(new RegExp(`{${$}}`,"g"),String(y))}),n)}class Ct{emit;constructor(u){this.emit=u}show(u,n,$=3e3){this.emit("notification:show",{message:u,type:n,duration:$})}showSuccess(u,n){this.show(u,"success",n)}showError(u,n){this.show(u,"error",n)}showWarning(u,n){this.show(u,"warning",n)}showNotification(u,n="success",$){this.show(u,n,$)}}const He=5,ze=2,Fe=({data:m,emit:u,element:n,KEY:$})=>{let y=null,A=null,B=null,K=null,S=[],X=[];const z=new Ct(u);let s={defaultHoursPerDay:8,defaultHoursPerWeek:40,excelImportEnabled:!1,workWeekDays:[1,2,3,4,5],language:"auto",activityLogSettings:{enabled:!0,logCreate:!0,logUpdate:!0,logDelete:!0,archiveAfterDays:90},schemaVersion:ze,lastModified:Date.now()},Q=!0,ae="",Y=!1,x=null,G="general",ie=!1,P=null,W="",Z=0,q=!1,D=[],ne=!1,O=[],se=!1,le=!1,Ce=!1,F={defaultHoursPerDay:8,defaultHoursPerWeek:40,excelImportEnabled:!1,workWeekDays:[1,2,3,4,5]},ee={employeeGroupId:void 0,volunteerGroupId:void 0,userHoursConfig:void 0},te={managerGroupId:void 0,managerAssignments:void 0},R=[],M=[],de="all",U="all",ce="",ue="",I=1;const ge=50;let me=!1,Ie={...s.activityLogSettings},ve=null;const Be=e=>{(se||le)&&(e.preventDefault(),e.returnValue="")};window.addEventListener("beforeunload",Be);async function Ge(){try{Q=!0,v(),y=(await xt($,m.extensionInfo?.name||"Time Tracker",m.extensionInfo?.description||"Time tracking for church employees")).id,A=await be("workcategories","Work Categories","Categories for time tracking"),B=await be("settings","Settings","Extension configuration settings"),K=await be("settings_backups","Settings Backups","Automatic backups of extension settings"),await Ue(),await _e();const r=s.language||"auto",o=r==="auto"?Se():r;console.log("[Admin] Language settings:",{savedLanguage:s.language,autoDetected:Se(),finalLanguage:o}),await Me(o),await Promise.all([Le(),(async()=>{X=await ke()})()]),s.employeeGroupId&&await De(s.employeeGroupId),s.managerGroupId&&await Ee(s.managerGroupId),await We(),Q=!1,v()}catch(e){console.error("[TimeTracker Admin] Initialization error:",e),Q=!1,ae=e instanceof Error?e.message:"Failed to initialize",v()}}async function We(){try{if(!y)return;if(ve=await fe("activityLog"),!ve){R=[];return}R=(await V(ve.id,y)).sort((r,o)=>o.timestamp-r.timestamp),re()}catch(e){console.error("[TimeTracker Admin] Failed to load activity logs:",e),R=[]}}function re(){M=R.filter(e=>!(de!=="all"&&e.userId.toString()!==de||U!=="all"&&e.action!==U||ce&&new Date(e.timestamp).toISOString().split("T")[0]<ce||ue&&new Date(e.timestamp).toISOString().split("T")[0]>ue)),I=1}async function be(e,r,o){const a=await fe(e);if(a)return a;const i=await St({customModuleId:y,name:r,shorty:e,description:o},y);if(!i)throw new Error(`Failed to create category: ${e}`);return i}async function Ue(){try{const e=await V(A.id,y),r=["Office Work","Pastoral Care","Event Preparation","Administration"];let o=0;for(const a of e)if(r.includes(a.name)){const i=a.id;if(i&&typeof i=="number")try{await $e(A.id,i,y),console.log(`[TimeTracker Admin] Removed old default category: ${a.name} (ID: ${i})`),o++}catch(l){console.error(`[TimeTracker Admin] Failed to delete ${a.name}:`,l)}}o>0&&console.log(`[TimeTracker Admin] Cleanup complete. Removed ${o} old default categories.`)}catch(e){console.error("[TimeTracker Admin] Failed to remove old categories:",e)}}async function Le(){try{S=(await T.churchtoolsClient.get(`/custommodules/${y}/customdatacategories/${A.id}/customdatavalues`)).map(r=>{const o=r.id,a=JSON.parse(r.value);return{id:a.id,name:a.name,color:a.color,kvStoreId:o}}),console.log("[TimeTracker Admin] Loaded categories:",S)}catch(e){console.error("[TimeTracker Admin] Failed to load categories:",e),S=[]}}async function _e(){try{const e=await V(B.id,y);e.length>0?(s=e[0],s.schemaVersion||(s.schemaVersion=1,s.lastModified=Date.now())):await he({dataCategoryId:B.id,value:JSON.stringify(s)},y),F={defaultHoursPerDay:s.defaultHoursPerDay,defaultHoursPerWeek:s.defaultHoursPerWeek,excelImportEnabled:s.excelImportEnabled,workWeekDays:s.workWeekDays?[...s.workWeekDays]:[1,2,3,4,5]},ee={employeeGroupId:s.employeeGroupId,volunteerGroupId:s.volunteerGroupId,userHoursConfig:s.userHoursConfig?JSON.parse(JSON.stringify(s.userHoursConfig)):void 0},te={managerGroupId:s.managerGroupId,managerAssignments:s.managerAssignments?JSON.parse(JSON.stringify(s.managerAssignments)):void 0}}catch(e){console.error("[TimeTracker Admin] Failed to load settings:",e)}}function Ve(e){return e?typeof e.defaultHoursPerDay!="number"?{isValid:!1,error:t("ct.extension.timetracker.admin.validation.hoursPerDayInvalid")}:typeof e.defaultHoursPerWeek!="number"?{isValid:!1,error:t("ct.extension.timetracker.admin.validation.hoursPerWeekInvalid")}:e.employeeGroupId!==void 0&&typeof e.employeeGroupId!="number"?{isValid:!1,error:"employeeGroupId must be a number"}:e.userHoursConfig&&!Array.isArray(e.userHoursConfig)?{isValid:!1,error:"userHoursConfig must be an array"}:{isValid:!0}:{isValid:!1,error:t("ct.extension.timetracker.admin.validation.settingsNull")}}async function Oe(e,r){try{const a=(await V(K.id,y)).sort((l,d)=>d.timestamp-l.timestamp),i={timestamp:Date.now(),settings:JSON.parse(JSON.stringify(e)),summary:r,version:e.schemaVersion||1};if(await he({dataCategoryId:K.id,value:JSON.stringify(i)},y),a.length>=He){const l=a.slice(He-1);for(const d of l){const g=d.id;g&&await $e(K.id,g)}}console.log("[TimeTracker Admin] Backup created:",r)}catch(o){console.error("[TimeTracker Admin] Backup failed:",o)}}async function ke(){try{return(await V(K.id,y)).sort((r,o)=>o.timestamp-r.timestamp)}catch(e){return console.error("[TimeTracker Admin] Failed to load backups",e),[]}}async function Ae(e){if(confirm(t("ct.extension.timetracker.admin.restoreBackupConfirm")))try{const o=(await ke()).find(a=>a.id===e);if(!o){alert(t("ct.extension.timetracker.admin.backupNotFound"));return}await j(o.settings,`Restored from backup ${new Date(o.timestamp).toLocaleString()}`),alert(t("ct.extension.timetracker.admin.backupRestored")),X=await ke(),v()}catch(r){console.error("[TimeTracker Admin] Restore failed:",r),alert(t("ct.extension.timetracker.admin.backupRestoreFailed")+": "+(r instanceof Error?r.message:"Unknown error"))}}async function j(e,r){const o=r||t("ct.extension.timetracker.admin.settingsUpdated").replace("{version}",(e.schemaVersion||1).toString()),a=Ve(e);if(!a.isValid)throw new Error(`Settings validation failed: ${a.error}`);try{s&&s.defaultHoursPerDay&&await Oe(s,o),e.lastModified=Date.now(),e.schemaVersion=ze;const i=await V(B.id,y);if(i.length>0){const l=i[0].id;await we(B.id,l,{dataCategoryId:B.id,value:JSON.stringify(e)})}else await he({dataCategoryId:B.id,value:JSON.stringify(e)},y);s=e}catch(i){throw console.error("[TimeTracker Admin] Failed to save settings:",i),i}}async function De(e){try{q=!0,v();const r=await T.churchtoolsClient.get(`/groups/${e}/members`),o=new Set(r.map(a=>a.personId||a.id));D=r.map(a=>{let i="",l="";a.person?.domainAttributes&&(i=a.person.domainAttributes.firstName||"",l=a.person.domainAttributes.lastName||""),!i&&!l&&(i=a.firstName||a.vorname||"",l=a.lastName||a.nachname||a.name||"");const d=i&&l?`${i} ${l}`:i||l||`User ${a.personId||a.id}`;return{userId:a.personId||a.id||0,userName:d,firstName:i||"",lastName:l||""}}).sort((a,i)=>a.firstName!==i.firstName?a.firstName.localeCompare(i.firstName):a.lastName.localeCompare(i.lastName)),s.userHoursConfig&&(s.userHoursConfig.forEach(a=>{o.has(a.userId)?a.isActive=!0:a.isActive=!1}),s.userHoursConfig.forEach(a=>{!a.isActive&&!D.find(i=>i.userId===a.userId)&&D.push({userId:a.userId,userName:a.userName})})),q=!1,v()}catch(r){console.error("[TimeTracker Admin] Failed to load employees:",r),q=!1,D=[],z.showError(t("ct.extension.timetracker.admin.employeeLoadFailed")),v()}}async function Ee(e){try{ne=!0,v(),O=(await T.churchtoolsClient.get(`/groups/${e}/members`)).map(o=>{let a="",i="";o.person?.domainAttributes&&(a=o.person.domainAttributes.firstName||"",i=o.person.domainAttributes.lastName||""),!a&&!i&&(a=o.firstName||o.vorname||"",i=o.lastName||o.nachname||o.name||"");const l=a&&i?`${a} ${i}`:a||i||`User ${o.personId||o.id}`;return{userId:o.personId||o.id||0,userName:l}}).sort((o,a)=>o.userName.localeCompare(a.userName)),ne=!1,v()}catch(r){console.error("[TimeTracker Admin] Failed to load managers:",r),ne=!1,O=[],z.showError(t("ct.extension.timetracker.admin.managerLoadFailed"),5e3),v()}}async function Re(e){try{const{kvStoreId:r,...o}=e,a=JSON.stringify(o);if(r){await we(A.id,r,{value:a},y);const i=S.findIndex(l=>l.kvStoreId===r);i!==-1&&(S[i]=e)}else await he({dataCategoryId:A.id,value:a},y),await Le()}catch(r){throw console.error("[TimeTracker Admin] Failed to save category:",r),r}}async function je(e){try{const r=await fe("timeentries");return r?(await V(r.id,y)).filter(a=>a.categoryId===e).length:0}catch(r){return console.error("[TimeTracker Admin] Failed to count entries:",r),0}}async function Je(e,r){try{const o=await fe("timeentries");if(!o)return;const a=await T.churchtoolsClient.get(`/custommodules/${y}/customdatacategories/${o.id}/customdatavalues`),i=S.find(d=>d.id===r);if(!i)throw new Error("Replacement category not found");let l=0;for(const d of a){const g=JSON.parse(d.value);g.categoryId===e&&(g.categoryId=r,g.categoryName=i.name,await we(o.id,d.id,{value:JSON.stringify(g)},y),l++)}console.log(`[TimeTracker Admin] Reassigned ${l} entries from ${e} to ${r}`)}catch(o){throw console.error("[TimeTracker Admin] Failed to reassign entries:",o),o}}async function Ke(e){try{const r=S.find(o=>o.id===e);if(!r)throw new Error("Category not found");Z=await je(e),Z>0?(P=r,ie=!0,W=S.find(o=>o.id!==e)?.id||"",v()):(await Te(e),z.showError(t("ct.extension.timetracker.admin.createCategoryFailed")),v())}catch(r){console.error("[TimeTracker Admin] Failed to initiate delete:",r),u("notification",{message:"Failed to delete category",type:"error",duration:3e3})}}async function Xe(){try{if(!P||!W)throw new Error("Missing category information");await Je(P.id,W),await Te(P.id),ie=!1,P=null,W="",Z=0,u("notification",{message:t("ct.extension.timetracker.admin.categoryDeletedReassigned"),type:"success",duration:3e3}),v()}catch(e){console.error("[TimeTracker Admin] Failed to confirm delete:",e),u("notification",{message:"Failed to delete category",type:"error",duration:3e3})}}function Qe(){ie=!1,P=null,W="",Z=0,v()}async function Te(e){try{const r=S.find(o=>o.id===e);if(r&&r.kvStoreId)await $e(A.id,r.kvStoreId,y),S=S.filter(o=>o.id!==e);else throw new Error("Category not found or missing kvStoreId")}catch(r){throw console.error("[TimeTracker Admin] Failed to delete category:",r),r}}function Ye(){const e=n.querySelector("#hours-per-day"),r=n.querySelector("#hours-per-week"),o=n.querySelector("#excel-import-toggle");if(!e||!r||!o)return!1;if(parseFloat(e.value)!==F.defaultHoursPerDay||parseFloat(r.value)!==F.defaultHoursPerWeek||o.checked!==F.excelImportEnabled)return!0;const a=[];return n.querySelectorAll(".work-week-day-checkbox").forEach((i,l)=>{i.checked&&a.push(l)}),a.length!==F.workWeekDays.length||!a.every((i,l)=>i===F.workWeekDays[l])}function Ze(){const e=n.querySelector("#employee-group-id"),r=n.querySelector("#volunteer-group-id");if(!e||!r)return!1;const o=e.value?parseInt(e.value):void 0,a=r.value?parseInt(r.value):void 0;if(o!==ee.employeeGroupId||a!==ee.volunteerGroupId)return!0;const i=[];D.forEach(d=>{const g=n.querySelector(`.employee-hours-day[data-user-id="${d.userId}"]`),h=n.querySelector(`.employee-hours-week[data-user-id="${d.userId}"]`);if(g&&h){const c=parseFloat(g.value)||F.defaultHoursPerDay,b=parseFloat(h.value)||F.defaultHoursPerWeek,w=[];n.querySelectorAll(`.user-work-week-checkbox[data-user-id="${d.userId}"]`).forEach(L=>{const p=parseInt(L.dataset.day);L.checked&&w.push(p)}),i.push({userId:d.userId,userName:d.userName,hoursPerDay:c,hoursPerWeek:b,workWeekDays:w.length>0?w:void 0})}});const l=ee.userHoursConfig||[];if(i.length!==l.length)return!0;for(const d of i){const g=l.find(b=>b.userId===d.userId);if(!g||d.hoursPerDay!==g.hoursPerDay||d.hoursPerWeek!==g.hoursPerWeek)return!0;const h=d.workWeekDays||[],c=g.workWeekDays||[];if(h.length!==c.length||!h.every((b,w)=>b===c[w]))return!0}return!1}function et(){const e=n.querySelector("#manager-group-id");if(e&&(e.value?parseInt(e.value):void 0)!==te.managerGroupId)return!0;const r=n.querySelectorAll(".manager-employee-checkbox");if(r.length===0)return(te.managerAssignments||[]).length>0;const o=new Map;r.forEach(l=>{const d=l,g=parseInt(d.dataset.managerId||"0"),h=parseInt(d.dataset.employeeId||"0");d.checked&&(o.has(g)||o.set(g,new Set),o.get(g).add(h))});const a=[];o.forEach((l,d)=>{a.push({managerId:d,managerName:"",employeeIds:Array.from(l).sort()})});const i=te.managerAssignments||[];if(a.length!==i.length)return!0;for(const l of a){const d=i.find(c=>c.managerId===l.managerId);if(!d)return!0;const g=l.employeeIds,h=[...d.employeeIds].sort();if(g.length!==h.length||g.some((c,b)=>c!==h[b]))return!0}for(const l of i)if(!a.find(g=>g.managerId===l.managerId))return!0;return!1}function E(){se=Ye(),le=Ze(),Ce=et();const e=n.querySelector("#save-group-settings-btn"),r=n.querySelector("#save-settings-btn"),o=n.querySelector("#save-manager-assignments-btn"),a=(i,l)=>{i&&(l?(i.style.cssText="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: #dc3545 !important; color: white !important; border: none !important; border-radius: 4px !important; cursor: pointer !important; font-size: 1rem !important; font-weight: 600 !important; transition: background 0.2s !important; animation: pulse 2s ease-in-out infinite;",i.innerHTML=`
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    ${t("ct.extension.timetracker.admin.saveWithChanges")}
                `):(i.style.cssText="width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: #28a745 !important; color: white !important; border: none !important; border-radius: 4px !important; cursor: pointer !important; font-size: 1rem !important; font-weight: 600 !important; transition: background 0.2s !important;",i.innerHTML=`
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    ${t("ct.extension.timetracker.admin.savedState")}
                `))};e&&a(e,le),r&&a(r,se),o&&a(o,Ce)}function tt(){const e=Math.ceil(M.length/ge),r=(I-1)*ge,o=Math.min(r+ge,M.length),a=M.slice(r,o),i=new Date().setHours(0,0,0,0),l=M.filter(c=>c.timestamp>=i).length,d=M.filter(c=>c.action==="CREATE").length,g=M.filter(c=>c.action==="UPDATE").length,h=M.filter(c=>c.action==="DELETE").length;return`
            <!-- Activity Log Section -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 0.5rem 0; font-size: 1.3rem; color: #333;">${t("ct.extension.timetracker.admin.activityLog")}</h2>
                <p style="margin: 0 0 1.5rem 0; color: #666; font-size: 0.95rem;">${t("ct.extension.timetracker.admin.activityLog.description")}</p>

                <!-- Activity Log Settings -->
                <div style="background: #f9f9f9; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem; color: #333;">${t("ct.extension.timetracker.admin.activityLog.settings")}</h3>
                    
                    <div style="display: grid; gap: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="activity-log-enabled" ${s.activityLogSettings?.enabled?"checked":""} 
                                   style="cursor: pointer;"/>
                            <span>${t("ct.extension.timetracker.admin.activityLog.enableLogging")}</span>
                        </label>

                        <div style="display: flex; gap: 1.5rem; margin-left: 1.5rem;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" id="activity-log-create" ${s.activityLogSettings?.logCreate?"checked":""}
                                       ${s.activityLogSettings?.enabled?"":"disabled"} style="cursor: pointer;"/>
                                <span style="color: ${s.activityLogSettings?.enabled?"":"#999"};">${t("ct.extension.timetracker.admin.activityLog.logCreate")}</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" id="activity-log-update" ${s.activityLogSettings?.logUpdate?"checked":""}
                                       ${s.activityLogSettings?.enabled?"":"disabled"} style="cursor: pointer;"/>
                                <span style="color: ${s.activityLogSettings?.enabled?"":"#999"};">${t("ct.extension.timetracker.admin.activityLog.logUpdate")}</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" id="activity-log-delete" ${s.activityLogSettings?.logDelete?"checked":""}
                                       ${s.activityLogSettings?.enabled?"":"disabled"} style="cursor: pointer;"/>
                                <span style="color: ${s.activityLogSettings?.enabled?"":"#999"};">${t("ct.extension.timetracker.admin.activityLog.logDelete")}</span>
                            </label>
                        </div>

                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem; align-items: center;">
                            <label for="activity-log-archive-days">${t("ct.extension.timetracker.admin.activityLog.archiveAfterDays")}:</label>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <input type="range" id="activity-log-archive-days" min="30" max="365" step="5"
                                       value="${s.activityLogSettings?.archiveAfterDays||90}"
                                       ${s.activityLogSettings?.enabled?"":"disabled"}
                                       style="flex: 1;"/>
                                <span id="archive-days-value" style="min-width: 60px; font-weight: bold;">${s.activityLogSettings?.archiveAfterDays||90} ${t("ct.extension.timetracker.dashboard.day")}${(s.activityLogSettings?.archiveAfterDays||90)>1?"s":""}</span>
                            </div>
                            <div style="grid-column: 2; font-size: 0.85rem; color: #666;">
                                ${t("ct.extension.timetracker.admin.activityLog.archiveAfterDaysHelp")}
                            </div>
                        </div>
                    </div>

                    <button id="save-activity-log-settings-btn"
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: ${me?"#dc3545":"#28a745"}; 
                                   color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                        ${t("ct.extension.timetracker.admin.activityLog.saveSettings")}
                    </button>
                </div>

                <!-- Statistics -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: #f0f8ff; padding: 1rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #007bff;">${M.length}</div>
                        <div style="font-size: 0.85rem; color: #666;">${t("ct.extension.timetracker.admin.activityLog.activeLogs")}</div>
                    </div>
                    <div style="background: #f0fff4; padding: 1rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${l}</div>
                        <div style="font-size: 0.85rem; color: #666;">${t("ct.extension.timetracker.admin.activityLog.actionsToday")}</div>
                    </div>
                    <div style="background: #fef5e7; padding: 1rem; border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #f39c12;">
                            C:${d} U:${g} D:${h}
                        </div>
                        <div style="font-size: 0.85rem; color: #666;">${t("ct.extension.timetracker.admin.activityLog.byAction")}</div>
                    </div>
                </div>

                <!-- Filters -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.9rem; color: #666;">${t("ct.extension.timetracker.admin.activityLog.filterUser")}</label>
                        <select id="log-filter-user" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="all">${t("ct.extension.timetracker.entries.allUsers")}</option>
                            ${[...new Set(R.map(c=>c.userId))].map(c=>{const b=R.find(w=>w.userId===c);return`<option value="${c}" ${de===c.toString()?"selected":""}>${b?.userName||`User ${c}`}</option>`}).join("")}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.9rem; color: #666;">${t("ct.extension.timetracker.admin.activityLog.filterAction")}</label>
                        <select id="log-filter-action" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="all" ${U==="all"?"selected":""}>${t("ct.extension.timetracker.admin.activityLog.allActions")}</option>
                            <option value="CREATE" ${U==="CREATE"?"selected":""}>${t("ct.extension.timetracker.admin.activityLog.created")}</option>
                            <option value="UPDATE" ${U==="UPDATE"?"selected":""}>${t("ct.extension.timetracker.admin.activityLog.updated")}</option>
                            <option value="DELETE" ${U==="DELETE"?"selected":""}>${t("ct.extension.timetracker.admin.activityLog.deleted")}</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.9rem; color: #666;">${t("ct.extension.timetracker.admin.activityLog.dateFrom")}</label>
                        <input type="date" id="log-filter-date-from" value="${ce}"
                               style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"/>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.25rem; font-size: 0.9rem; color: #666;">${t("ct.extension.timetracker.admin.activityLog.dateTo")}</label>
                        <input type="date" id="log-filter-date-to" value="${ue}"
                               style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;"/>
                    </div>
                </div>

                <!-- Log Table -->
                ${a.length>0?`
                    <div style="overflow-x: auto; margin-bottom: 1rem;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                            <thead>
                                <tr style="background: #f5f5f5;">
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">${t("ct.extension.timetracker.admin.activityLog.timestamp")}</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">${t("ct.extension.timetracker.admin.activityLog.user")}</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">${t("ct.extension.timetracker.admin.activityLog.action")}</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">${t("ct.extension.timetracker.admin.activityLog.details")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${a.map(c=>{const b=c.action==="CREATE"?"#28a745":c.action==="UPDATE"?"#ffc107":"#dc3545";return`
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding: 0.75rem;">${new Date(c.timestamp).toLocaleString()}</td>
                                            <td style="padding: 0.75rem;">${c.userName}</td>
                                            <td style="padding: 0.75rem;"><span style="background: ${b}; color: white; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.85rem;">${c.action}</span></td>
                                            <td style="padding: 0.75rem; font-size: 0.85rem; color: #666;">
                                                ${c.details.categoryName||""} 
                                                ${c.details.description?`- ${c.details.description.substring(0,50)}${c.details.description.length>50?"...":""}`:""}
                                                ${c.details.duration?`(${Math.round(c.details.duration/1e3/60)}min)`:""}
                                            </td>
                                        </tr>
                                    `}).join("")}
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    ${e>1?`
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 0;">
                            <div style="font-size: 0.9rem; color: #666;">
                                ${t("ct.extension.timetracker.admin.activityLog.showingEntries").replace("{from}",(r+1).toString()).replace("{to}",o.toString()).replace("{total}",M.length.toString())}
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button id="log-prev-page" ${I===1?"disabled":""}
                                        style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: ${I===1?"#f5f5f5":"#fff"}; 
                                               border-radius: 4px; cursor: ${I===1?"not-allowed":"pointer"};">
                                    ← Prev
                                </button>
                                <span style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: #f5f5f5; border-radius: 4px;">
                                    ${t("ct.extension.timetracker.admin.activityLog.page").replace("{current}",I.toString()).replace("{total}",e.toString())}
                                </span>
                                <button id="log-next-page" ${I===e?"disabled":""}
                                        style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: ${I===e?"#f5f5f5":"#fff"}; 
                                               border-radius: 4px; cursor: ${I===e?"not-allowed":"pointer"};">
                                    Next →
                                </button>
                            </div>
                        </div>
                    `:""}
                `:`
                    <div style="padding: 2rem; text-align: center; color: #999;">
                        ${t("ct.extension.timetracker.admin.activityLog.noLogs")}
                    </div>
                `}
            </div>
        `}function rt(){if(X.length===0)return`
                <div style="margin-top: 3rem; border-top: 1px solid #eee; padding-top: 2rem;">
                    <h3 style="color: #333; margin-bottom: 1rem;">${t("ct.extension.timetracker.admin.settingsBackup")}</h3>
                    <p style="color: #666; font-style: italic;">${t("ct.extension.timetracker.admin.noBackups")}</p>
                </div>
            `;const e=X.map(r=>{const o=new Date(r.timestamp).toLocaleString(),a=r.id;return`
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid #eee;">
                    <div>
                        <div style="font-weight: 600; color: #333;">${o}</div>
                        <div style="font-size: 0.85rem; color: #666;">${r.summary||"No summary"}</div>
                    </div>
                    <button class="restore-backup-btn btn btn-sm btn-outline-secondary" data-backup-id="${a}" style="padding: 0.25rem 0.5rem; border: 1px solid #ccc; background: #fff; border-radius: 4px; cursor: pointer;">
                        ${t("ct.extension.timetracker.admin.restoreBackup")}
                    </button>
                </div>
            `}).join("");return`
            <div style="margin-top: 3rem; border-top: 1px solid #eee; padding-top: 2rem;">
                <h3 style="color: #333; margin-bottom: 1rem;">${t("ct.extension.timetracker.admin.settingsBackup")}</h3>
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="padding: 1rem; background: #f8f9fa; border-bottom: 1px solid #ddd; font-size: 0.9rem; color: #666;">
                        ${t("ct.extension.timetracker.admin.lastBackups").replace("{count}",X.length.toString())}
                    </div>
                    ${e}
                </div>
            </div>
        `}function v(){const e=(r,o,a)=>{const i=G===r;return`
                <button
                    class="admin-tab-btn"
                    data-tab="${r}"
                    style="
                        padding: 0.75rem 1.5rem;
                        cursor: pointer;
                        background: none;
                        border: none;
                        border-bottom: 3px solid ${i?"#007bff":"transparent"};
                        font-weight: ${i?"600":"500"};
                        color: ${i?"#333":"#666"};
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 1rem;
                    "
                >
                    ${a}
                    ${o}
                </button>
            `};n.innerHTML=`
            <div style="max-width: 900px; margin: 2rem auto; padding: 2rem;">
                <!-- Extension Info Header -->
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h1 style="margin: 0 0 0.5rem 0; font-size: 1.8rem; color: #333;">${t("ct.extension.timetracker.admin.title")}</h1>
                            <p style="margin: 0 0 0.5rem 0; color: #666;">
                                ${t("ct.extension.timetracker.admin.description")}
                            </p>
                        </div>
                        <div style="text-align: right; font-size: 0.85rem; color: #999;">
                            <div>v${m.extensionInfo?.version||"N/A"}</div>
                        </div>
                    </div>
                </div>

                ${Q?`
                    <div style="max-width: 1200px; margin: 0 auto; text-align: center; padding: 3rem;">
                        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" style="animation: spin 1s linear infinite;">
                                <style>
                                    @keyframes spin {
                                        from { transform: rotate(0deg); }
                                        to { transform: rotate(360deg); }
                                    }
                                </style>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                            </svg>
                        </div>
                        <p>Loading settings...</p>
                    </div>
                `:ae?`
                    <div style="padding: 1.5rem; background: #fee; border: 1px solid #fcc; border-radius: 8px; color: #c00; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <strong>Error:</strong> ${ae}
                    </div>
                `:`
                    <!-- Tab Navigation -->
                    <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid #ddd; margin-bottom: 2rem; overflow-x: auto;">
                        ${e("general",t("ct.extension.timetracker.admin.generalSettings"),'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>')}
                        ${e("users",t("ct.extension.timetracker.admin.userManagement"),'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>')}
                        ${e("maintenance",t("ct.extension.timetracker.admin.maintenance"),'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>')}
                    </div>

                    <!-- Tab Content -->
                    <div class="tab-content">
                        ${G==="general"?`
                                ${ot()}
                                ${nt()}
                            `:""}

                        ${G==="users"?`
                                ${at()}
                                ${it()}
                            `:""}

                        ${G==="maintenance"?`
                                ${tt()}
                                ${rt()}
                            `:""}
                    </div>
                `}
            </div>
        `,!Q&&!ae&&(n.querySelectorAll(".admin-tab-btn").forEach(o=>{o.addEventListener("click",()=>{const a=o.dataset.tab;a&&(G=a,v())})}),G==="general"?st():G==="users"?lt():G==="maintenance"&&yt(),setTimeout(()=>E(),0))}function ot(){return`
            <!-- General Settings -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.3rem; color: #333;">${t("ct.extension.timetracker.admin.generalSettings")}</h2>
                <p style="margin: 0 0 1.5rem 0; color: #666; font-size: 0.95rem;">
                    ${t("ct.extension.timetracker.admin.generalSettingsHelp")}
                </p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                            ${t("ct.extension.timetracker.admin.hoursPerDay")}
                        </label>
                        <input
                            type="number"
                            id="hours-per-day"
                            value="${s.defaultHoursPerDay}"
                            min="1"
                            max="24"
                            step="0.5"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                        <small style="color: #666; font-size: 0.85rem;">${t("ct.extension.timetracker.admin.hoursHelp")}</small>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                            ${t("ct.extension.timetracker.admin.hoursPerWeek")}
                        </label>
                        <input
                            type="number"
                            id="hours-per-week"
                            value="${s.defaultHoursPerWeek}"
                            min="1"
                            max="168"
                            step="0.5"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                        <small style="color: #666; font-size: 0.85rem;">${t("ct.extension.timetracker.admin.hoursHelp")}</small>
                    </div>
                </div>

                <!-- Language Selection -->
                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                        ${t("ct.extension.timetracker.admin.language")}
                    </label>
                    <select
                        id="language-select"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; cursor: pointer;"
                    >
                        <option value="auto" ${(s.language||"auto")==="auto"?"selected":""}>🌐 ${t("ct.extension.timetracker.admin.languageAuto")}</option>
                        <option value="de" ${s.language==="de"?"selected":""}>🇩🇪 Deutsch</option>
                        <option value="en" ${s.language==="en"?"selected":""}>🇬🇧 English</option>
                    </select>
                    <small style="color: #666; font-size: 0.85rem; display: block; margin-top: 0.5rem;">
                        ${t("ct.extension.timetracker.admin.languageHelp")}
                    </small>
                </div>

                <!-- Work Week Days Configuration -->
                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #333;">${t("ct.extension.timetracker.admin.workWeekDays")}</h3>
                    <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.95rem;">
                        ${t("ct.extension.timetracker.admin.workWeekDaysHelp")}
                    </p>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem;">
                        ${[{day:0,label:t("ct.extension.timetracker.common.weekDaysFull.sun")},{day:1,label:t("ct.extension.timetracker.common.weekDaysFull.mon")},{day:2,label:t("ct.extension.timetracker.common.weekDaysFull.tue")},{day:3,label:t("ct.extension.timetracker.common.weekDaysFull.wed")},{day:4,label:t("ct.extension.timetracker.common.weekDaysFull.thu")},{day:5,label:t("ct.extension.timetracker.common.weekDaysFull.fri")},{day:6,label:t("ct.extension.timetracker.common.weekDaysFull.sat")}].map(({day:e,label:r})=>{const o=(s.workWeekDays||[1,2,3,4,5]).includes(e);return`
                                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: ${o?"#e7f3ff":"#f8f9fa"}; border: 1px solid ${o?"#007bff":"#dee2e6"}; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                    <input
                                        type="checkbox"
                                        class="work-week-day-checkbox"
                                        data-day="${e}"
                                        ${o?"checked":""}
                                        style="width: 18px; height: 18px; cursor: pointer;"
                                    />
                                    <span style="font-weight: ${o?"600":"400"}; color: ${o?"#007bff":"#333"}; font-size: 0.9rem;">${r}</span>
                                </label>
                            `}).join("")}
                    </div>
                </div>

                <!-- ${t("ct.extension.timetracker.admin.alphaFeatures")} -->
                <div style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 2v6m0 0v6m0-6h6M9 8H3m18 4v6m0 0v2m0-2h-6m6 0h2"></path>
                            <circle cx="9" cy="14" r="3"></circle>
                            <circle cx="18" cy="6" r="3"></circle>
                        </svg>
                        ${t("ct.extension.timetracker.admin.alphaFeatures")}
                    </h3>
                    <p style="margin: 0 0 1rem 0; color: #ff9800; font-size: 0.9rem; background: #fff3e0; padding: 0.75rem; border-radius: 4px; border-left: 3px solid #ff9800;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#856404" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 0.5rem;">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        ${t("ct.extension.timetracker.admin.alphaWarning")}
                    </p>

                    <label style="display: flex; align-items: center; cursor: pointer; padding: 0.75rem; background: #f8f9fa; border-radius: 4px; border: 1px solid #e0e0e0;">
                        <input
                            type="checkbox"
                            id="excel-import-toggle"
                            ${s.excelImportEnabled?"checked":""}
                            style="width: 20px; height: 20px; margin-right: 0.75rem; cursor: pointer;"
                        />
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #333; margin-bottom: 0.25rem;">
                                ${t("ct.extension.timetracker.admin.excelImportEnabled")}
                                <span style="background: #ff9800; color: white; padding: 0.125rem 0.5rem; border-radius: 3px; font-size: 0.75rem; margin-left: 0.5rem; font-weight: 700;">ALPHA</span>
                            </div>
                            <div style="color: #666; font-size: 0.85rem;">
                                ${t("ct.extension.timetracker.admin.excelImportDescription")}
                            </div>
                        </div>
                    </label>
                </div>

                <button
                    id="save-settings-btn"
                    style="width: 100%; padding: 0.75rem 1.5rem; background: #28a745 !important; color: white !important; border: none !important; border-radius: 4px !important; cursor: pointer !important; font-size: 1rem !important; font-weight: 600 !important; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 3rem; transition: background 0.2s !important;"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    ${t("ct.extension.timetracker.admin.settingsSaved")}
                </button>

                <div id="settings-status" style="margin-top: 1rem; padding: 0.75rem; border-radius: 4px; display: none;"></div>
            </div>
        `}function at(){return s.userHoursConfig||(s.userHoursConfig=[]),`
            <!-- Group Management -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.3rem; color: #333;">👥 ${t("ct.extension.timetracker.admin.employeeConfig")}</h2>
                <p style="margin: 0 0 1.5rem 0; color: #666; font-size: 0.95rem;">
                    ${t("ct.extension.timetracker.admin.employeeGroupHelp")}
                </p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                            ${t("ct.extension.timetracker.admin.employeeGroup")}
                        </label>
                        <input
                            type="number"
                            id="employee-group-id"
                            value="${s.employeeGroupId||""}"
                            placeholder="e.g., 42"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                        <small style="color: #666; font-size: 0.85rem;">${t("ct.extension.timetracker.admin.employeeGroupHelp")}</small>
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                            ${t("ct.extension.timetracker.admin.volunteerGroup")}
                        </label>
                        <input
                            type="number"
                            id="volunteer-group-id"
                            value="${s.volunteerGroupId||""}"
                            placeholder="e.g., 43"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                        <small style="color: #666; font-size: 0.85rem;">${t("ct.extension.timetracker.admin.volunteerGroupHelp")}</small>
                    </div>
                </div>

                <!-- Employee Configuration -->
                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #333; display: flex; align-items: center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.5rem;">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        ${t("ct.extension.timetracker.admin.userManagement")}
                    </h3>
                    <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.9rem;">
                        ${t("ct.extension.timetracker.admin.individualSettingsHelp")}
                    </p>

                    ${D.length>0?`
                        <!-- Employees Table -->
                        <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin: 0 0 1rem 0;">
                                <p style="margin: 0; color: #333; font-weight: 600;">
                                    ${t("ct.extension.timetracker.admin.foundEmployees").replace("{count}",D.length.toString())}
                                </p>
                                <button
                                    id="refresh-employees-btn"
                                    ${!s.employeeGroupId||q?"disabled":""}
                                    style="padding: 0.5rem; background: ${!s.employeeGroupId||q?"#6c757d":"#17a2b8"}; color: white; border: none; border-radius: 4px; cursor: ${!s.employeeGroupId||q?"not-allowed":"pointer"}; display: inline-flex; align-items: center; gap: 0.5rem;"
                                    title="${q?"Loading...":"Refresh employees from ChurchTools"}"
                                >
                                    ${q?`
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                                            <style>
                                                @keyframes spin {
                                                    from { transform: rotate(0deg); }
                                                    to { transform: rotate(360deg); }
                                                }
                                            </style>
                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                        </svg>
                                    `:`
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="23 4 23 10 17 10"></polyline>
                                            <polyline points="1 20 1 14 7 14"></polyline>
                                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                        </svg>
                                    `}
                                </button>
                            </div>

                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background: #e9ecef;">
                                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333;">${t("ct.extension.timetracker.admin.employee")}</th>
                                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333;">${t("ct.extension.timetracker.admin.status")}</th>
                                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333;">${t("ct.extension.timetracker.admin.hoursPerDay")}</th>
                                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333;">${t("ct.extension.timetracker.admin.hoursPerWeek")}</th>
                                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333; min-width: 280px;">${t("ct.extension.timetracker.admin.workWeekDays")}</th>
                                            <th style="padding: 0.75rem; text-align: center; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #333;">${t("ct.extension.timetracker.timeEntries.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${D.map(e=>{const r=s.userHoursConfig?.find(l=>l.userId===e.userId),o=r?.hoursPerDay||s.defaultHoursPerDay,a=r?.hoursPerWeek||s.defaultHoursPerWeek,i=r?.isActive!==!1;return`
                                                <tr style="border-bottom: 1px solid #dee2e6; ${i?"":"background: #fff3cd;"}">
                                                    <td style="padding: 0.75rem; color: #333;">
                                                        ${e.userName} <span style="color: #999; font-size: 0.85rem;">(${e.userId})</span>
                                                    </td>
                                                    <td style="padding: 0.75rem;">
                                                        ${i?`
                                                            <span style="background: #d4edda; color: #155724; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid #c3e6cb; white-space: nowrap;">
                                                                ✓ ${t("ct.extension.timetracker.admin.active")}
                                                            </span>
                                                        `:`
                                                            <span style="background: #fff3cd; color: #856404; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: 1px solid #ffeaa7;">
                                                                ⚠ ${t("ct.extension.timetracker.admin.removed")}
                                                            </span>
                                                        `}
                                                    </td>
                                                    <td style="padding: 0.75rem;">
                                                        <input
                                                            type="number"
                                                            class="employee-hours-day"
                                                            data-user-id="${e.userId}"
                                                            data-user-name="${e.userName}"
                                                            value="${o}"
                                                            min="0.5"
                                                            max="24"
                                                            step="0.5"
                                                            ${i?"":"disabled"}
                                                            style="width: 80px; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px; ${i?"":"background: #f5f5f5; cursor: not-allowed;"}"
                                                        />
                                                    </td>
                                                    <td style="padding: 0.75rem;">
                                                        <input
                                                            type="number"
                                                            class="employee-hours-week"
                                                            data-user-id="${e.userId}"
                                                            data-user-name="${e.userName}"
                                                            value="${a}"
                                                            min="0.5"
                                                            max="168"
                                                            step="0.5"
                                                            ${i?"":"disabled"}
                                                            style="width: 80px; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px; ${i?"":"background: #f5f5f5; cursor: not-allowed;"}"
                                                        />
                                                    </td>
                                                    <td style="padding: 0.75rem;">
                                                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
                                                            ${[t("ct.extension.timetracker.common.weekDays.sun"),t("ct.extension.timetracker.common.weekDays.mon"),t("ct.extension.timetracker.common.weekDays.tue"),t("ct.extension.timetracker.common.weekDays.wed"),t("ct.extension.timetracker.common.weekDays.thu"),t("ct.extension.timetracker.common.weekDays.fri"),t("ct.extension.timetracker.common.weekDays.sat")].map((l,d)=>{const h=(r?.workWeekDays||s.workWeekDays||[1,2,3,4,5]).includes(d);return`
                                                                <label style="display: flex; align-items: center; justify-content: center; cursor: ${i?"pointer":"not-allowed"}; opacity: ${i?"1":"0.5"};" title="${[t("ct.extension.timetracker.common.weekDaysFull.sun"),t("ct.extension.timetracker.common.weekDaysFull.mon"),t("ct.extension.timetracker.common.weekDaysFull.tue"),t("ct.extension.timetracker.common.weekDaysFull.wed"),t("ct.extension.timetracker.common.weekDaysFull.thu"),t("ct.extension.timetracker.common.weekDaysFull.fri"),t("ct.extension.timetracker.common.weekDaysFull.sat")][d]}">
                                                                    <input
                                                                        type="checkbox"
                                                                        class="user-work-week-checkbox"
                                                                        data-user-id="${e.userId}"
                                                                        data-day="${d}"
                                                                        ${h?"checked":""}
                                                                        ${i?"":"disabled"}
                                                                        style="width: 16px; height: 16px; cursor: ${i?"pointer":"not-allowed"}; margin: 0; accent-color: #007bff;"
                                                                    />
                                                                    <span style="font-size: 0.7rem; margin-left: 2px; color: ${i?"#333":"#999"}; user-select: none;">${l}</span>
                                                                </label>
                `}).join("")}
                                                        </div>
                                                    </td>
                                                    <td style="padding: 0.75rem; text-align: center;">
                                                        ${i?`
                                                            <span style="color: #999; font-size: 0.85rem; font-style: italic;">-</span>
                                                        `:`
                                                            <button
                                                                class="delete-employee-btn"
                                                                data-user-id="${e.userId}"
                                                                data-user-name="${e.userName}"
                                                                style="padding: 0.4rem 0.8rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;"
                                                                title="${t("ct.extension.timetracker.admin.deleteEmployeeTooltip")}"
                                                            >
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                </svg>
                                                                ${t("ct.extension.timetracker.common.delete")}
                                                            </button>
                                                        `}
                                                    </td>
                                                </tr>
                                            `}).join("")}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `:!q&&s.employeeGroupId?`
                        <p style="color: #666; font-style: italic; background: #f8f9fa; padding: 1rem; border-radius: 4px; border-left: 3px solid #6c757d;">
                            ${t("ct.extension.timetracker.admin.clickLoadEmployees")}
                        </p>
                    `:""}
                </div>

                <button
                    id="save-group-settings-btn"
                    style="width: 100%; padding: 0.75rem 1.5rem; background: #28a745 !important; color: white !important; border: none !important; border-radius: 4px !important; cursor: pointer !important; font-size: 1rem !important; font-weight: 600 !important; margin-top: 3rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.2s !important;"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    ${t("ct.extension.timetracker.admin.settingsSaved")}
                </button>

                <div id="group-settings-status" style="margin-top: 1rem; padding: 0.75rem; border-radius: 4px; display: none;"></div>
            </div>
        `}function it(){return s.employeeGroupId?(s.managerAssignments||(s.managerAssignments=[]),`
            <!-- Manager Assignments -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 1rem 0; font-size: 1.3rem; color: #333;">👔 ${t("ct.extension.timetracker.admin.managerAssignment.title")}</h2>
                <div style="margin-bottom: 1rem; color: #666; font-size: 0.9rem;">
                    ${t("ct.extension.timetracker.admin.managerAssignment.description")}
                </div>

                <!-- Manager Group ID Input -->
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                        ${t("ct.extension.timetracker.admin.managerAssignment.groupId")}
                    </label>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input
                            type="number"
                            id="manager-group-id"
                            value="${s.managerGroupId||""}"
                            placeholder="${t("ct.extension.timetracker.admin.managerAssignment.placeholder")}"
                            style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                        <button
                            id="load-managers-btn"
                            style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; white-space: nowrap;"
                        >
                            ${t("ct.extension.timetracker.admin.managerAssignment.loadButton")}
                        </button>
                    </div>
                    <small style="color: #666; font-size: 0.85rem;">${t("ct.extension.timetracker.admin.managerAssignment.groupIdHelp")}</small>
                </div>

                ${ne?`
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <div style="display: inline-block;">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#007bff" stroke-width="2" style="animation: spin 1s linear infinite;">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                            </svg>
                        </div>
                        <p style="margin-top: 1rem;">${t("ct.extension.timetracker.admin.managerAssignment.loadingManagers")}</p>
                    </div>
                `:O.length>0?`
                    <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 1rem; margin-bottom: 1rem;">
                        <h4 style="margin: 0 0 0.5rem 0;">${t("ct.extension.timetracker.admin.managerAssignment.listTitle",{count:O.length})}</h4>
                        
                        ${O.map(e=>{const o=s.managerAssignments?.find(a=>a.managerId===e.userId)?.employeeIds||[];return`
                                <div style="background: white; border: 1px solid #dee2e6; border-radius: 4px; padding: 1rem; margin-bottom: 0.75rem;">
                                    <h4 style="margin: 0 0 0.75rem 0; font-size: 1rem; color: #495057;">${e.userName}</h4>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem;">
                                        ${D.map(a=>{const i=o.includes(a.userId);return`
                                                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-radius: 3px; cursor: pointer; hover: background: #f8f9fa;">
                                                    <input
                                                        type="checkbox"
                                                        class="manager-employee-checkbox"
                                                        data-manager-id="${e.userId}"
                                                        data-employee-id="${a.userId}"
                                                        ${i?"checked":""}
                                                        style="width: 16px; height: 16px; cursor: pointer; accent-color: #007bff;"
                                                    />
                                                    <span style="font-size: 0.9rem;">${a.userName}</span>
                                                </label>
                                            `}).join("")}
                                    </div>
                                </div>
                            `}).join("")}
                    </div>

                    <!-- Status Message -->
                    <div id="manager-assignments-status" style="display: none; padding: 1rem; margin-top: 1rem; border-radius: 4px; font-size: 0.95rem; font-weight: 600;"></div>

                    <button
                        id="save-manager-assignments-btn"
                        style="width: 100%; margin-top: 1.5rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 600;"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        ${t("ct.extension.timetracker.admin.managerAssignment.saveButton")}
                    </button>
                `:s.managerGroupId?`
                    <div style="text-align: center; padding: 2rem; color: #666; background: #f8f9fa; border-radius: 4px;">
                        <p>${t("ct.extension.timetracker.admin.managerAssignment.clickLoad",{groupId:s.managerGroupId})}</p>
                    </div>
                `:""}
            </div>
        `):""}function nt(){return`
            <!-- Work Categories -->
            <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <h2 style="margin: 0 0 0.25rem 0; font-size: 1.3rem; color: #333;">${t("ct.extension.timetracker.admin.workCategories")}</h2>
                        <p style="margin: 0; color: #666; font-size: 0.95rem;">
                            ${t("ct.extension.timetracker.admin.workCategoriesHelp")}
                        </p>
                    </div>
                    <button
                        id="add-category-btn"
                        style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.5rem;"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        ${t("ct.extension.timetracker.admin.addCategory")}
                    </button>
                </div>

                ${Y||x?`
                    <!-- Category Form -->
                    <div style="background: #f8f9fa; border: 2px solid ${x?"#ffc107":"#28a745"}; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0 0 1rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                            ${x?`
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                ${t("ct.extension.timetracker.admin.editCategory")}
                            `:`
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                ${t("ct.extension.timetracker.admin.addCategory")}
                            `}
                        </h3>

                        <div style="display: grid; gap: 1rem; margin-bottom: 1rem;">
                            ${x?`
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                                    ${t("ct.extension.timetracker.admin.categoryId")}
                                </label>
                                <input
                                    type="text"
                                    id="category-id"
                                    value="${x.id}"
                                    disabled
                                    style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; background: #e9ecef; cursor: not-allowed; font-family: monospace;"
                                />
                                <small style="color: #666; font-size: 0.85rem;">${t("ct.extension.timetracker.admin.idCannotBeChanged")}</small>
                            </div>
                            `:""}

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                                    ${t("ct.extension.timetracker.admin.categoryName")}
                                </label>
                                <input
                                    type="text"
                                    id="category-name"
                                    value="${x?.name||""}"
                                    placeholder="e.g., Pastoral Care"
                                    style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;"
                                />
                                <small style="color: #666; font-size: 0.85rem;">${t("ct.extension.timetracker.admin.categoryNameHelp")}</small>
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #333; font-weight: 600;">
                                    ${t("ct.extension.timetracker.admin.categoryColor")}
                                </label>
                                <div style="display: flex; gap: 1rem; align-items: center;">
                                    <input
                                        type="color"
                                        id="category-color"
                                        value="${x?.color||"#007bff"}"
                                        style="width: 80px; height: 45px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;"
                                    />
                                    <input
                                        type="text"
                                        id="category-color-hex"
                                        value="${x?.color||"#007bff"}"
                                        placeholder="#007bff"
                                        style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;"
                                    />
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 0.5rem;">
                            <button
                                id="save-category-btn"
                                style="padding: 0.75rem 1.5rem; background: ${x?"#ffc107":"#28a745"}; color: ${x?"#333":"white"}; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                ${t("ct.extension.timetracker.common.save")}
                            </button>
                            <button
                                id="cancel-category-btn"
                                style="padding: 0.75rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;"
                            >
                                ${t("ct.extension.timetracker.common.cancel")}
                            </button>
                        </div>

                        <div id="category-form-status" style="margin-top: 1rem; padding: 0.75rem; border-radius: 4px; display: none;"></div>
                    </div>
                `:""}

                ${ie&&P?`
                    <!-- Delete Confirmation Dialog -->
                    <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0 0 1rem 0; color: #856404; display: flex; align-items: center; gap: 0.5rem;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            ${t("ct.extension.timetracker.admin.categoryInUse")}
                        </h3>

                        <p style="color: #856404; margin-bottom: 1rem;">
                            ${t("ct.extension.timetracker.admin.categoryInUseMessage",{categoryName:P.name,count:Z})}
                        </p>

                        <p style="color: #856404; margin-bottom: 1rem;">
                            ${t("ct.extension.timetracker.admin.selectReplacementCategory")}
                        </p>

                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: #856404; font-weight: 600;">
                                ${t("ct.extension.timetracker.admin.replacementCategory")}
                            </label>
                            <select
                                id="replacement-category-select"
                                style="width: 100%; padding: 0.75rem; border: 1px solid #ffc107; border-radius: 4px; background: white;"
                            >
                                ${S.filter(e=>e.id!==P.id).map(e=>`<option value="${e.id}" ${e.id===W?"selected":""}>${e.name}</option>`).join("")}
                            </select>
                        </div>

                        <div style="display: flex; gap: 0.5rem;">
                            <button
                                id="confirm-delete-btn"
                                style="padding: 0.75rem 1.5rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                ${t("ct.extension.timetracker.admin.deleteCategoryAndReassign")}
                            </button>
                            <button
                                id="cancel-delete-btn"
                                style="padding: 0.75rem 1.5rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;"
                            >
                                ${t("ct.extension.timetracker.common.cancel")}
                            </button>
                        </div>
                    </div>
                `:""}

                <!-- Categories List -->
                ${S.length===0?`<p style="color: #666; text-align: center; padding: 2rem;">${t("ct.extension.timetracker.admin.noCategoriesDefined")}</p>`:`
                    <div style="display: grid; gap: 1rem;">
                        ${S.map(e=>`
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; border: 1px solid #dee2e6; border-radius: 6px; background: #f8f9fa;">
                                <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                                    <div style="width: 40px; height: 40px; background: ${e.color}; border-radius: 6px; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
                                    <div>
                                        <div style="font-weight: 600; color: #333; margin-bottom: 0.25rem;">${e.name}</div>
                                        <div style="font-size: 0.85rem; color: #666; font-family: monospace;">${e.id}</div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button
                                        data-category-id="${e.id}"
                                        class="edit-category-btn"
                                        style="padding: 0.5rem 1rem; background: #ffc107; color: #333; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        ${t("ct.extension.timetracker.common.edit")}
                                    </button>
                                    <button
                                        data-category-id="${e.id}"
                                        class="delete-category-btn"
                                        style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                        ${t("ct.extension.timetracker.common.delete")}
                                    </button>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                `}
            </div>
        `}function st(){n.querySelector("#save-settings-btn")?.addEventListener("click",async()=>{await ct()}),n.querySelectorAll("#hours-per-day, #hours-per-week").forEach(p=>{p.addEventListener("input",()=>{E()})}),n.querySelector("#language-select")?.addEventListener("change",()=>{E()}),n.querySelector("#excel-import-toggle")?.addEventListener("change",()=>{E()}),n.querySelectorAll(".work-week-day-checkbox").forEach(p=>{p.addEventListener("change",()=>{E()})});const a=n.querySelector("#add-category-btn"),i=n.querySelector("#cancel-category-btn"),l=n.querySelector("#save-category-btn");a?.addEventListener("click",()=>{Y=!0,x=null,v()}),i?.addEventListener("click",()=>{Y=!1,x=null,v()}),l?.addEventListener("click",async()=>{await pt()});const d=n.querySelector("#category-color"),g=n.querySelector("#category-color-hex");d?.addEventListener("input",p=>{const f=p.target.value;g&&(g.value=f)}),g?.addEventListener("input",p=>{const f=p.target.value;/^#[0-9A-Fa-f]{6}$/.test(f)&&d&&(d.value=f)});const h=n.querySelectorAll(".edit-category-btn"),c=n.querySelectorAll(".delete-category-btn");h.forEach(p=>{p.addEventListener("click",f=>{f.stopPropagation(),f.preventDefault();const k=f.currentTarget.dataset.categoryId;console.log("[TimeTracker Admin] Edit button clicked, categoryId:",k),console.log("[TimeTracker Admin] Available categories:",S);const C=S.find(N=>N.id===k);console.log("[TimeTracker Admin] Found category:",C),C?(x={...C},Y=!1,v()):(console.error("[TimeTracker Admin] Category not found for ID:",k),alert("Category not found. Please refresh the page."))})}),c.forEach(p=>{p.addEventListener("click",f=>{f.stopPropagation(),f.preventDefault();const k=f.currentTarget.dataset.categoryId;console.log("[TimeTracker Admin] Delete button clicked, categoryId:",k),k?Ke(k):(console.error("[TimeTracker Admin] Category ID not found"),alert("Category not found. Please refresh the page."))})});const b=n.querySelector("#confirm-delete-btn");b&&b.addEventListener("click",()=>{Xe()});const w=n.querySelector("#cancel-delete-btn");w&&w.addEventListener("click",()=>{Qe()});const L=n.querySelector("#replacement-category-select");L&&L.addEventListener("change",p=>{W=p.target.value}),n.querySelectorAll(".restore-backup-btn").forEach(p=>{p.addEventListener("click",async f=>{const k=f.target.closest(".restore-backup-btn");if(k){const C=parseInt(k.getAttribute("data-backup-id")||"0");C&&await Ae(C)}})})}function lt(){const e=n.querySelector("#refresh-employees-btn"),r=n.querySelector("#save-group-settings-btn");e?.addEventListener("click",async()=>{const i=n.querySelector("#employee-group-id"),l=parseInt(i.value);l&&l>0&&await De(l)}),r?.addEventListener("click",async()=>{await gt()}),n.querySelectorAll("#employee-group-id, #volunteer-group-id").forEach(i=>{i.addEventListener("input",()=>{E()})}),n.querySelectorAll(".delete-employee-btn").forEach(i=>{i.addEventListener("click",async l=>{const d=l.target,g=parseInt(d.getAttribute("data-user-id")||"0"),h=d.getAttribute("data-user-name")||"Unknown";confirm(`Delete employee "${h}" and all their time tracking data?

This action cannot be undone!`)&&await ut(g)})}),n.querySelectorAll(".user-work-week-checkbox").forEach(i=>{i.addEventListener("change",()=>{E()})}),n.querySelectorAll(".employee-hours-day, .employee-hours-week").forEach(i=>{i.addEventListener("input",()=>{E()})});const o=n.querySelector("#load-managers-btn"),a=n.querySelector("#save-manager-assignments-btn");o?.addEventListener("click",async()=>{const i=n.querySelector("#manager-group-id"),l=parseInt(i.value);l&&l>0&&(s.managerGroupId=l,await Ee(l))}),a?.addEventListener("click",async()=>{await dt()}),n.querySelectorAll(".manager-employee-checkbox").forEach(i=>{i.addEventListener("change",()=>{E()})})}async function dt(){const e=n.querySelector("#save-manager-assignments-btn"),r=n.querySelector("#manager-assignments-status");if(!e||!r)return;const o=`
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
        `;try{e.disabled=!0,e.innerHTML=o+"Saving...";const a=n.querySelectorAll(".manager-employee-checkbox"),i=new Map;a.forEach(d=>{const g=d,h=parseInt(g.dataset.managerId||"0"),c=parseInt(g.dataset.employeeId||"0");g.checked&&(i.has(h)||i.set(h,new Set),i.get(h).add(c))});const l=[];i.forEach((d,g)=>{const h=O.find(c=>c.userId===g);h&&l.push({managerId:g,managerName:h.userName,employeeIds:Array.from(d)})}),s.managerAssignments=l,await j(s,t("ct.extension.timetracker.admin.managerAssignmentsUpdated")),te={managerGroupId:s.managerGroupId,managerAssignments:JSON.parse(JSON.stringify(l))},r.style.display="block",r.style.background="#d4edda",r.style.border="1px solid #c3e6cb",r.style.color="#155724",r.textContent=`✓ Manager assignments saved! ${l.length} managers configured.`,z.showSuccess("✓ "+t("ct.extension.timetracker.admin.managerAssignment.saved")),console.log("[TimeTracker Admin] Manager assignments saved:",l),E(),setTimeout(()=>{r.style.display="none"},3e3),e.disabled=!1}catch(a){console.error("[TimeTracker Admin] Failed to save manager assignments:",a),e.disabled=!1,r.style.display="block",r.style.background="#f8d7da",r.style.border="1px solid #f5c6cb",r.style.color="#721c24",r.textContent="✗ Failed to save manager assignments: "+(a instanceof Error?a.message:"Unknown error"),z.showError("✗ Failed to save manager assignments",5e3)}}async function ct(){const e=n.querySelector("#hours-per-day"),r=n.querySelector("#hours-per-week"),o=n.querySelector("#excel-import-toggle"),a=n.querySelector("#language-select"),i=n.querySelector("#settings-status"),l=n.querySelector("#save-settings-btn");if(!e||!r||!o||!a||!i||!l)return;const d=`
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
        `;try{l.disabled=!0,l.innerHTML=d+"Saving...";const g=[];n.querySelectorAll(".work-week-day-checkbox").forEach(b=>{const w=b;if(w.checked){const L=parseInt(w.getAttribute("data-day")||"0");g.push(L)}}),g.sort((b,w)=>b-w);const c={...s,defaultHoursPerDay:parseFloat(e.value),defaultHoursPerWeek:parseFloat(r.value),excelImportEnabled:o.checked,workWeekDays:g,language:a.value};if(await j(c),c.language!==s.language){const b=(c.language||"auto")==="auto"?Se():c.language||"de";await Me(b),s=c,v();return}F={defaultHoursPerDay:c.defaultHoursPerDay,defaultHoursPerWeek:c.defaultHoursPerWeek,excelImportEnabled:c.excelImportEnabled,workWeekDays:[...c.workWeekDays]},se=!1,E(),i.style.display="block",i.style.background="#d4edda",i.style.border="1px solid #c3e6cb",i.style.color="#155724",i.textContent="✓ "+t("ct.extension.timetracker.admin.settingsSavedSuccess"),z.showSuccess("✓ "+t("ct.extension.timetracker.admin.settingsSaved")),setTimeout(()=>{i.style.display="none"},3e3)}catch(g){console.error("[TimeTracker Admin] Save settings error:",g),i.style.display="block",i.style.background="#f8d7da",i.style.border="1px solid #f5c6cb",i.style.color="#721c24",i.textContent="✗ Failed to save: "+(g instanceof Error?g.message:"Unknown error")}finally{l.disabled=!1,l.innerHTML=d+"Save General Settings"}}async function ut(e){try{s.userHoursConfig&&(s.userHoursConfig=s.userHoursConfig.filter(r=>r.userId!==e)),D=D.filter(r=>r.userId!==e),await j(s),u("notification",{message:t("ct.extension.timetracker.admin.employeeDeletedSuccess"),type:"success",duration:3e3}),v()}catch(r){console.error("[TimeTracker Admin] Failed to delete employee:",r),u("notification",{message:"Failed to delete employee",type:"error",duration:3e3})}}async function gt(){const e=n.querySelector("#employee-group-id"),r=n.querySelector("#volunteer-group-id"),o=n.querySelector("#group-settings-status"),a=n.querySelector("#save-group-settings-btn");if(!o||!a)return;const i=`
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
        `;try{a.disabled=!0,a.innerHTML=i+"Saving...";const l=e?.value?parseInt(e.value):void 0,d=r?.value?parseInt(r.value):void 0,g=[];n.querySelectorAll(".global-work-week-checkbox").forEach(H=>{const k=H;k.checked&&g.push(parseInt(k.getAttribute("data-day")||"0"))}),g.sort((H,k)=>H-k);const c=[],b=n.querySelectorAll(".employee-hours-day"),w=n.querySelectorAll(".employee-hours-week"),L=n.querySelectorAll(".user-work-week-checkbox"),p=new Map;L.forEach(H=>{const k=H;if(k.checked){const C=parseInt(k.dataset.userId||"0"),N=parseInt(k.dataset.day||"0");p.has(C)||p.set(C,[]),p.get(C).push(N)}}),b.forEach((H,k)=>{const C=H,N=parseInt(C.dataset.userId||"0"),ft=parseFloat(C.value),ht=parseFloat(w[k]?.value||"0");if(N>0){const vt=D.find(_=>_.userId===N)?.userName||`User ${N}`,pe=[];n.querySelectorAll(`.user-work-week-checkbox[data-user-id="${N}"]`).forEach(_=>{const ye=_;if(ye.checked){const kt=parseInt(ye.getAttribute("data-day")||"0");pe.push(kt)}}),pe.sort((_,ye)=>_-ye);const bt=s.userHoursConfig?.find(_=>_.userId===N);c.push({userId:N,userName:vt,hoursPerDay:ft,hoursPerWeek:ht,isActive:bt?.isActive!==!1,workWeekDays:pe.length>0?pe:void 0})}});const f={...s,employeeGroupId:l,volunteerGroupId:d,userHoursConfig:c,workWeekDays:g};await j(f),ee={employeeGroupId:f.employeeGroupId,volunteerGroupId:f.volunteerGroupId,userHoursConfig:f.userHoursConfig?JSON.parse(JSON.stringify(f.userHoursConfig)):void 0},le=!1,E(),o.style.display="block",o.style.background="#d4edda",o.style.border="1px solid #c3e6cb",o.style.color="#155724",o.textContent="✓ "+t("ct.extension.timetracker.admin.groupSettingsSavedDetail",{count:c.length}),z.showSuccess("✓ "+t("ct.extension.timetracker.admin.groupSettingsSaved")),setTimeout(()=>{o.style.display="none"},3e3)}catch(l){console.error("[TimeTracker Admin] Save group settings error:",l),o.style.display="block",o.style.background="#f8d7da",o.style.border="1px solid #f5c6cb",o.style.color="#721c24",o.textContent="✗ Failed to save: "+(l instanceof Error?l.message:"Unknown error")}finally{a.disabled=!1,a.innerHTML=i+t("ct.extension.timetracker.admin.saveGroupSettings")}}function mt(e){const r=e.toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g,"");let o=r,a=1;for(;S.some(i=>i.id===o);)o=`${r}${a}`,a++;return o}async function pt(){const e=n.querySelector("#category-name"),r=n.querySelector("#category-color"),o=n.querySelector("#category-form-status"),a=n.querySelector("#save-category-btn");if(!e||!r||!o||!a)return;const i=`
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
        `;if(!e.value.trim()){alert("Please enter a category name");return}const l=x?x.id:mt(e.value.trim());try{a.disabled=!0,a.innerHTML=i+(x?"Updating...":"Saving...");const d={id:l,name:e.value.trim(),color:r.value,kvStoreId:x?.kvStoreId};await Re(d),o.style.display="block",o.style.background="#d4edda",o.style.border="1px solid #c3e6cb",o.style.color="#155724",o.textContent=x?"✓ "+t("ct.extension.timetracker.admin.categoryUpdatedSuccess"):"✓ "+t("ct.extension.timetracker.admin.categoryCreatedSuccess"),z.showSuccess(t(x?"ct.extension.timetracker.admin.categoryUpdated":"ct.extension.timetracker.admin.categoryCreated")),setTimeout(()=>{Y=!1,x=null,v()},1500)}catch(d){console.error("[TimeTracker Admin] Save category error:",d),o.style.display="block",o.style.background="#f8d7da",o.style.border="1px solid #f5c6cb",o.style.color="#721c24",o.textContent="✗ Failed to save: "+(d instanceof Error?d.message:"Unknown error")}finally{a.disabled=!1,a.innerHTML=i+(x?"Update Category":"Save Category")}}function yt(){const e=n.querySelector("#activity-log-enabled"),r=n.querySelector("#activity-log-create"),o=n.querySelector("#activity-log-update"),a=n.querySelector("#activity-log-delete"),i=n.querySelector("#activity-log-archive-days"),l=n.querySelector("#save-activity-log-settings-btn"),d=n.querySelector("#log-filter-user"),g=n.querySelector("#log-filter-action"),h=n.querySelector("#log-filter-date-from"),c=n.querySelector("#log-filter-date-to"),b=n.querySelector("#log-prev-page");b&&(b.textContent=t("ct.extension.timetracker.common.prev"));const w=n.querySelector("#log-next-page");w&&(w.textContent=t("ct.extension.timetracker.common.next"));function L(){const p=s.activityLogSettings,f=Ie;me=p?.enabled!==f?.enabled||p?.logCreate!==f?.logCreate||p?.logUpdate!==f?.logUpdate||p?.logDelete!==f?.logDelete||p?.archiveAfterDays!==f?.archiveAfterDays,l&&(l.style.background=me?"#dc3545":"#28a745")}e?.addEventListener("change",()=>{s.activityLogSettings||(s.activityLogSettings={enabled:!0,logCreate:!0,logUpdate:!0,logDelete:!0,archiveAfterDays:90}),s.activityLogSettings.enabled=e.checked,[r,o,a,i].forEach(p=>{p&&(p.disabled=!e.checked)}),L(),v()}),[r,o,a].forEach(p=>{p?.addEventListener("change",()=>{s.activityLogSettings&&(p===r&&(s.activityLogSettings.logCreate=p.checked),p===o&&(s.activityLogSettings.logUpdate=p.checked),p===a&&(s.activityLogSettings.logDelete=p.checked),L())})}),i?.addEventListener("input",()=>{if(!s.activityLogSettings)return;const p=parseInt(i.value);s.activityLogSettings.archiveAfterDays=p;const f=n.querySelector("#archive-days-value");f&&(f.textContent=`${p} ${t("ct.extension.timetracker.dashboard.day")}${p>1?"s":""}`),L()}),l?.addEventListener("click",async()=>{try{await j(s,t("ct.extension.timetracker.admin.activityLogSettingsUpdated")),Ie={...s.activityLogSettings},me=!1,v(),z.showSuccess("✓ Activity log settings saved!")}catch(p){console.error("[Admin] Failed to save activity log settings:",p),z.showError(t("ct.extension.timetracker.admin.activityLogSettingsFailed"),5e3)}}),d?.addEventListener("change",()=>{de=d.value,re(),v()}),g?.addEventListener("change",()=>{U=g.value,re(),v()}),h?.addEventListener("change",()=>{ce=h.value,re(),v()}),c?.addEventListener("change",()=>{ue=c.value,re(),v()}),b?.addEventListener("click",()=>{I>1&&(I--,v())}),w?.addEventListener("click",()=>{const p=Math.ceil(M.length/ge);I<p&&(I++,v())}),n.querySelectorAll(".restore-backup-btn").forEach(p=>{p.addEventListener("click",async f=>{const k=f.target.closest(".restore-backup-btn");if(k){const C=parseInt(k.getAttribute("data-backup-id")||"0");C&&await Ae(C)}})})}return Ge(),()=>{}},Ne=Fe,Dt=Object.freeze(Object.defineProperty({__proto__:null,adminEntryPoint:Ne,default:Ne,renderAdmin:Fe},Symbol.toStringTag,{value:"Module"}));export{Ct as N,V as a,Pe as b,Se as c,$e as d,St as e,he as f,fe as g,Dt as h,Me as i,Fe as r,t,we as u};
