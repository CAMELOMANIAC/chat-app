import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

/**
 * 컨트롤러에서는 보통 라우터를 이용하기 위해 사용한다.
 * 여기서는 비즈니스 로직도 같이 작성하였지만 실제로는 model에 비즈니스로직을 처리해야함
 */

@Controller('chat')
export class ChatController {
    @Get()
    name():string {
        return 'hello'
    }

    @Get('search')
    search(@Query('content') content: string):string{
        return content
    }


    @Get(':id')
    dynamicParams(@Param ('id') id:string):string{
        return id
    }

    @Post('create')
    createChat(@Body() chatData){
        return chatData
    }
}
