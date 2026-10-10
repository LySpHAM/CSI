import { redirect } from "next/navigation";

/** Route lisible pour ouvrir giao diện Swagger UI do FastAPI sinh ra. */
export default function BackendApiPage(): never {
  // Bản API đang chạy local dùng đường dẫn Swagger mặc định của FastAPI.
  // Môi trường triển khai của dự án đặt docs sau nginx tại /api/docs.
  redirect(process.env.NODE_ENV === "development" ? "http://localhost:8000/docs" : "/api/docs");
}
