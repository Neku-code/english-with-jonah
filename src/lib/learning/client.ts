export async function request<T=Record<string,unknown>>(url:string,body:Record<string,unknown>,method='POST'):Promise<T>{
 const r=await fetch(url,{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.message??'Saqlab bo‘lmadi. Qayta urinib ko‘ring.'),{code:data.code,status:r.status});return data as T;
}
