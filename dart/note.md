# dart 语言学习
## 基础知识
- dart 重要概念
    1. dart变量都是对象,都是某个类型的实例,null也是对象，所有的对象都继承Object类
    2. dart是强类型，但是可以省略类型注释 ，编译器自动推到类型，如果表示无具体类型 可声明为dynamic 类型
    3. dart支持泛型 如List\<int\>, List\<dynamic\>
    4. dart支持全局函数，局部函数(嵌套函数)，静态方法，实例方法，允许闭包函数
    5. dart支持全局变量，局部变量 ，静态属性，实例属性
    6. 以_开头的变量，函数，类相对库私有
    7. 标志符以字母或_开头，其后可以是数字和字母
    8. 表达式(有运行时的值) 语句(无运行时的值)
    > 泛型:允许强类型程序语言编写代码时允许部分类型是动态类型，但是在使用前必须声明为具体类型
- 程序入口函数main函数
    > 应用从main函数开始执行
- 声明变量(广义型，常量是一种只能赋值一次的变量)
 - var 变量名 = 值    （自动推到类型）
 - type 变量名        （给定的类型）
 - final 变量         （声明一个常量）
 - const 变量 = 值     (声明一个编译型常量，比如在声明时赋值)
 - const 可以修饰一个在编译时就固定的值 例如 var a = const []
 - const 一个变量接收到一个const修饰后值，变量是可以被修改
 - const 实例属性声明不能用const修饰，因为在类未初始化时，变量未获取到值
 - 静态变量可以用 staic const a = 值
 - 变量默认值为null
 - 内建类型 
    - Number(int,float)
    - String
    - Boolean
    - List
    - Set
    - Map
    - Rune
    - symbol
    

