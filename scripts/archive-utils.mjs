const DATE_PATTERN=/^\d{4}-\d{2}-\d{2}$/;

export function isReportDate(value){if(typeof value!=='string'||!DATE_PATTERN.test(value))return false;const[year,month,day]=value.split('-').map(Number);const date=new Date(Date.UTC(year,month-1,day));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;}
export function dateFromSearch(search){const value=new URLSearchParams(search).get('date');return isReportDate(value)?value:null;}
export function archiveUrl(date){if(!isReportDate(date))throw new TypeError('Invalid report date');return `data/archive/${date}.json`;}
export function feedUrl(date=null){return date?archiveUrl(date):'data/feed.json';}
export async function fetchReport(fetcher,date=null){const response=await fetcher(feedUrl(date),{cache:'no-store'});if(!response.ok)throw new Error('Report unavailable');return response.json();}
export function sortedReportDates(dates){return[...new Set(dates.filter(isReportDate))].sort();}
export function previousAvailableDate(dates,selected){return sortedReportDates(dates).filter(date=>date<selected).at(-1)||null;}
export function nextAvailableDate(dates,selected){return sortedReportDates(dates).find(date=>date>selected)||null;}
export function taipeiDay(date=new Date()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const get=type=>parts.find(part=>part.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;}
